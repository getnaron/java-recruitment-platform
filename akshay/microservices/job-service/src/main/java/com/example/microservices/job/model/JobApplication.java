package com.example.microservices.job.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "job_applications")
public class JobApplication {
    @Id
    private String id;
    private String jobId;
    private String candidateEmail;
    private String resumeUrl;
    private byte[] resumeData;
    private String resumeContentType;
    private String status; // e.g., "APPLIED", "REVIEWED", "REJECTED", "ACCEPTED"

    @CreatedDate
    private LocalDateTime appliedAt;
}
