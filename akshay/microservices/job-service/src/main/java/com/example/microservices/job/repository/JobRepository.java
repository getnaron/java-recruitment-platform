package com.example.microservices.job.repository;

import com.example.microservices.job.model.Job;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JobRepository extends MongoRepository<Job, String> {
    List<Job> findByRecruiterEmail(String recruiterEmail);
}
