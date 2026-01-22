package com.example.microservices.user.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {
    private String id;
    private String email;
    private String firstName;
    private String lastName;
    private String role;
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
}
