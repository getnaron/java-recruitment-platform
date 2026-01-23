package com.example.microservices.auth.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    private String id;

    @Indexed(unique = true, name = "email_1")
    private String email;

    private String password;

    private String firstName;

    private String lastName;

    private String role; // ADMIN, CANDIDATE, RECRUITER

    @CreatedDate
    private LocalDateTime createdAt;

    // Profile Fields
    private String resumeUrl;
    private String currentCompany;
    private String experienceYears;
    private String pastExperience;
    private String education;
    private String skills;
    private String countryCode;
    private String mobileNumber;

    // Binary Resume Storage
    @com.fasterxml.jackson.annotation.JsonIgnore
    private byte[] resumeData;
    private String resumeContentType;
}
