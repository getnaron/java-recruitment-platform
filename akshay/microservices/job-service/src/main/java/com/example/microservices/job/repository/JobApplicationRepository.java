package com.example.microservices.job.repository;

import com.example.microservices.job.model.JobApplication;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface JobApplicationRepository extends MongoRepository<JobApplication, String> {
    List<JobApplication> findByJobId(String jobId);

    List<JobApplication> findByCandidateEmail(String candidateEmail);

    List<JobApplication> findByJobIdIn(List<String> jobIds);

    boolean existsByJobIdAndCandidateEmail(String jobId, String candidateEmail);
}
