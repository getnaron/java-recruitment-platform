package com.example.microservices.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private String type = "Bearer";
    private String email;
    private String firstName;
    private String lastName;
    private String role;

    // Profile Fields
    private String currentCompany;
    private String experienceYears;
    private String education;
    private String skills;
    private String pastExperience;
    private String resumeUrl;
    private String countryCode;
    private String mobileNumber;
    private boolean isPremium;
    private String profilePictureUrl;

    public AuthResponse(String token, String email, String firstName, String lastName, String role) {
        this.token = token;
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
        this.role = role;
    }
}
