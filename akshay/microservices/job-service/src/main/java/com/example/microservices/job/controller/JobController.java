package com.example.microservices.job.controller;

import com.example.microservices.job.model.Job;
import com.example.microservices.job.repository.JobRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.example.microservices.job.repository.JobApplicationRepository;
import com.example.microservices.job.model.JobApplication;
import com.example.microservices.job.client.AuthServiceClient;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import java.io.IOException;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/job")
public class JobController {

    @Autowired
    private JobRepository jobRepository;

    @Autowired
    private JobApplicationRepository jobApplicationRepository;

    @Autowired
    private AuthServiceClient authServiceClient;

    @PostMapping("/create")
    public ResponseEntity<?> createJob(@RequestBody Job job) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String authority = auth.getAuthorities().iterator().next().getAuthority();
        String email = auth.getName();

        if (authority.equals("ROLE_RECRUITER") || authority.equals("ROLE_ADMIN")) {
            job.setRecruiterEmail(email);
            job.setCreatedAt(LocalDateTime.now());
            Job savedJob = jobRepository.save(job);
            return ResponseEntity.ok(savedJob);
        }

        return ResponseEntity.status(403).body("Access denied: Only Recruiters can create job openings.");
    }

    @GetMapping("/all")
    public ResponseEntity<List<Job>> getAllJobs() {
        return ResponseEntity.ok(jobRepository.findAll());
    }

    @GetMapping("/available")
    public ResponseEntity<List<Job>> getAvailableJobs() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName().toLowerCase().trim();
        String authority = auth.getAuthorities().iterator().next().getAuthority();

        List<Job> allJobs = jobRepository.findAll();
        System.out.println("DEBUG: getAvailableJobs for " + email + " (Role: " + authority + ")");

        if (authority.equals("ROLE_CANDIDATE")) {
            // Fetch applications with a more robust lookup
            List<JobApplication> myApps = jobApplicationRepository.findAll();
            java.util.Set<String> appliedJobIds = myApps.stream()
                    .filter(app -> app.getCandidateEmail() != null
                            && app.getCandidateEmail().toLowerCase().trim().equals(email))
                    .map(it -> it.getJobId() != null ? it.getJobId().trim() : "")
                    .filter(id -> !id.isEmpty())
                    .collect(java.util.stream.Collectors.toSet());

            System.out.println("DEBUG: Candidate " + email + " has applied to " + appliedJobIds.size() + " jobs. IDs: "
                    + appliedJobIds);

            List<Job> filteredJobs = allJobs.stream()
                    .filter(job -> {
                        String id = job.getId() != null ? job.getId().trim() : "";
                        boolean alreadyApplied = appliedJobIds.contains(id);
                        return !alreadyApplied;
                    })
                    .toList();

            System.out.println("DEBUG: Returning " + filteredJobs.size() + " jobs for candidate dashboard.");
            return ResponseEntity.ok(filteredJobs);
        }

        return ResponseEntity.ok(allJobs);
    }

    @GetMapping("/my-jobs")
    public ResponseEntity<List<Job>> getMyJobs() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        return ResponseEntity.ok(jobRepository.findByRecruiterEmail(email));
    }

    @PostMapping("/apply")
    public ResponseEntity<?> applyToJob(
            @RequestParam("jobId") String jobId,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "resumeName", required = false) String resumeName) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();

        if (jobApplicationRepository.existsByJobIdAndCandidateEmail(jobId, email)) {
            return ResponseEntity.badRequest().body("You have already applied for this job.");
        }

        JobApplication application = new JobApplication();
        application.setJobId(jobId);
        application.setCandidateEmail(email);
        application.setStatus("SUBMITTED");
        application.setAppliedAt(LocalDateTime.now());

        if (file != null && !file.isEmpty()) {
            try {
                application.setResumeData(file.getBytes());
                application.setResumeContentType(file.getContentType());
                application.setResumeUrl(file.getOriginalFilename());
            } catch (IOException e) {
                return ResponseEntity.internalServerError().body("Error reading resume file.");
            }
        } else if (resumeName != null) {
            application.setResumeUrl(resumeName);
            // Fetch resume data from auth-service if candidate used their profile resume
            try {
                ResponseEntity<byte[]> resumeResponse = authServiceClient.getInternalResume(email);
                if (resumeResponse.getStatusCode().is2xxSuccessful()
                        && resumeResponse.getHeaders().getContentType() != null) {
                    application.setResumeData(resumeResponse.getBody());
                    application.setResumeContentType(resumeResponse.getHeaders().getContentType().toString());
                } else if (resumeResponse.getStatusCode().is2xxSuccessful()) {
                    application.setResumeData(resumeResponse.getBody());
                    application.setResumeContentType("application/pdf"); // Default
                }
            } catch (Exception e) {
                System.out.println("DEBUG: Failed to fetch profile resume for application: " + e.getMessage());
                // Fallback: we still save the application with just the name
            }
        } else {
            return ResponseEntity.badRequest().body("Resume is required for application.");
        }

        jobApplicationRepository.save(application);
        return ResponseEntity.ok("Application submitted successfully!");
    }

    @GetMapping("/applications/my-jobs")
    public ResponseEntity<?> getApplicationsForMyJobs() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String recruiterEmail = auth.getName();

        List<Job> myJobs = jobRepository.findByRecruiterEmail(recruiterEmail);
        List<String> jobIds = myJobs.stream().map(Job::getId).toList();

        List<JobApplication> applications = jobApplicationRepository.findByJobIdIn(jobIds);

        return ResponseEntity.ok(applications);
    }

    @GetMapping("/applications/my-applications")
    public ResponseEntity<?> getMyApplications() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String candidateEmail = auth.getName();

        System.out.println("DEBUG: Fetching applications for email: " + candidateEmail);
        List<JobApplication> applications = jobApplicationRepository.findByCandidateEmail(candidateEmail);
        System.out.println("DEBUG: Found " + applications.size() + " applications");

        return ResponseEntity.ok(applications);
    }

    @GetMapping("/application/resume/{applicationId}")
    public ResponseEntity<byte[]> getApplicationResume(@PathVariable String applicationId) {
        JobApplication application = jobApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found"));

        // Security: Check if recruiter owns the job (optional but good)
        // For MVP, just return the data if it exists
        if (application.getResumeData() != null) {
            String contentType = application.getResumeContentType() != null ? application.getResumeContentType()
                    : "application/pdf";
            String filename = application.getResumeUrl() != null ? application.getResumeUrl() : "resume.pdf";

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "inline; filename=\"" + filename + "\"")
                    .body(application.getResumeData());
        }
        return ResponseEntity.notFound().build();
    }
}
