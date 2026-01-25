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
                        // Exclude closed or invalid jobs
                        if (job.getIsOpen() != null && !job.getIsOpen()) {
                            return false;
                        }
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
        String email = auth.getName().toLowerCase().trim();
        System.out.println("DEBUG: applyToJob for Candidate: " + email);

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
                System.out.println("DEBUG: Attempting to fetch profile resume from auth-service for " + email);
                ResponseEntity<byte[]> resumeResponse = authServiceClient.getInternalResume(email);
                if (resumeResponse.getStatusCode().is2xxSuccessful() && resumeResponse.getBody() != null
                        && resumeResponse.getBody().length > 0) {
                    byte[] body = resumeResponse.getBody();
                    application.setResumeData(body);
                    application.setResumeContentType("application/pdf");
                    System.out.println("DEBUG: Successfully fetched resume data, size: " + body.length + " bytes");
                } else {
                    System.out.println("DEBUG: Auth-service returned status: " + resumeResponse.getStatusCode()
                            + " or empty body.");
                    return ResponseEntity.badRequest()
                            .body("Failed to retrieve your profile resume. Please upload it again.");
                }
            } catch (Exception e) {
                System.out.println("DEBUG: Error fetching resume from auth-service: " + e.getMessage());
                e.printStackTrace();
                return ResponseEntity.status(500)
                        .body("Error communicating with authentication service: " + e.getMessage());
            }
        } else {
            return ResponseEntity.badRequest().body("Resume is required for application.");
        }

        if (application.getResumeData() != null) {
            System.out.println("DEBUG: Binary data ready for persistence. Size: " + application.getResumeData().length);
        } else {
            System.out.println("DEBUG: WARNING - Binary data is NULL before save!");
        }

        JobApplication saved = jobApplicationRepository.save(application);
        System.out.println("DEBUG: Application saved to MongoDB. ID: " + saved.getId() + " for candidate: " + email);
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
        System.out.println("DEBUG: getApplicationResume Request for ID: " + applicationId);

        JobApplication application = jobApplicationRepository.findById(applicationId)
                .orElse(null);

        if (application == null) {
            System.out.println("DEBUG: Application NOT FOUND in database for ID: " + applicationId);
            return ResponseEntity.status(404)
                    .body("Error: Application not found in database. Please verify the ID.".getBytes());
        }

        // 1. Try direct binary data from application record
        if (application.getResumeData() != null && application.getResumeData().length > 0) {
            System.out.println("DEBUG: Found direct binary data in Application record. Size: "
                    + application.getResumeData().length);
            return createResumeResponse(application.getResumeData(), application.getResumeContentType(),
                    application.getResumeUrl());
        }

        // 2. Fallback: Try fetching from auth-service profile
        String email = application.getCandidateEmail();
        System.out.println("DEBUG: Direct data NULL. Falling back to Profile Resume for: " + email);

        if (email == null || email.isEmpty()) {
            System.out.println("DEBUG: Candidate email is NULL/EMPTY in application record.");
            return ResponseEntity.status(404)
                    .body("Error: Candidate email is missing from the application. Cannot locate profile document."
                            .getBytes());
        }

        try {
            // Normalize email for the fetch
            String normalizedEmail = email.toLowerCase().trim();
            System.out.println("DEBUG: Calling Auth-Service for: " + normalizedEmail);

            ResponseEntity<byte[]> fallback = authServiceClient.getInternalResume(normalizedEmail);

            if (fallback.getStatusCode().is2xxSuccessful() && fallback.getBody() != null
                    && fallback.getBody().length > 0) {
                byte[] data = fallback.getBody();
                System.out.println("DEBUG: Successfully retrieved Profile Resume. Size: " + data.length);
                return createResumeResponse(data, "application/pdf", application.getResumeUrl());
            } else {
                String reason = (fallback.getBody() == null) ? "Body is null" : "Body is empty";
                System.out
                        .println("DEBUG: Auth-Service returned status: " + fallback.getStatusCode() + " but " + reason);
                return ResponseEntity.status(404)
                        .body(("Error: Candidate profile resume is missing (Phase 2: " + reason + ")").getBytes());
            }
        } catch (Exception e) {
            System.out.println("DEBUG: Auth-Service communication error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500)
                    .body(("Error: Failed to fetch resume from Auth-Service. " + e.getMessage()).getBytes());
        }
    }

    private ResponseEntity<byte[]> createResumeResponse(byte[] data, String contentType, String filename) {
        if (contentType == null || contentType.isEmpty())
            contentType = "application/pdf";
        if (filename == null || filename.isEmpty())
            filename = "resume.pdf";

        System.out.println("DEBUG: Creating resume response. Type: " + contentType + ", Filename: " + filename);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .body(data);
    }

    @PutMapping("/{jobId}/status")
    public ResponseEntity<?> updateJobStatus(
            @PathVariable String jobId,
            @RequestParam("isOpen") boolean isOpen) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String recruiterEmail = auth.getName();

        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new RuntimeException("Job not found"));

        // Security check: Only the job owner can change status
        if (!job.getRecruiterEmail().equals(recruiterEmail)) {
            return ResponseEntity.status(403).body("You are not authorized to modify this job.");
        }

        job.setIsOpen(isOpen);
        jobRepository.save(job);
        return ResponseEntity.ok("Job status updated successfully!");
    }

    @PutMapping("/application/{applicationId}/status")
    public ResponseEntity<?> updateApplicationStatus(
            @PathVariable String applicationId,
            @RequestParam("status") String status) {

        JobApplication application = jobApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found"));

        application.setStatus(status);
        jobApplicationRepository.save(application);
        return ResponseEntity.ok("Status updated successfully!");
    }
}
