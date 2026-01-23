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
        application.setStatus("APPLIED");
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
            // Note: If we just store the name, we assume we can fetch data later
            // For now, let's just save the application.
        } else {
            return ResponseEntity.badRequest().body("Resume is required for application.");
        }

        jobApplicationRepository.save(application);
        return ResponseEntity.ok("Application submitted successfully!");
    }
}
