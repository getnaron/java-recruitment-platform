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
@Document(collection = "jobs")
public class Job {
    @Id
    private String id;
    private String title;
    private String requirements;
    private String companyName;
    private String description;
    private Double salary;
    private String recruiterEmail;

    @CreatedDate
    private LocalDateTime createdAt;

    private Boolean isOpen = true;
}
