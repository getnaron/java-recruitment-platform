package com.example.microservices.job.controller;

import com.example.microservices.job.model.Job;
import com.example.microservices.job.repository.JobRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/job")
public class JobController {

    @Autowired
    private JobRepository jobRepository;

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
}
