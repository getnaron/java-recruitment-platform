package com.example.microservices.user.controller;

import com.example.microservices.user.client.AuthServiceClient;
import com.example.microservices.user.model.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/user")
public class UserController {

    @Autowired
    private AuthServiceClient authServiceClient;

    @GetMapping("/profile")
    public ResponseEntity<?> getUserProfile() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();

        // Call auth-service to get user details
        User user = authServiceClient.getUserByEmail(email);

        Map<String, Object> profile = new HashMap<>();
        profile.put("id", user.getId());
        profile.put("email", user.getEmail());
        profile.put("firstName", user.getFirstName());
        profile.put("lastName", user.getLastName());
        profile.put("role", user.getRole());
        profile.put("createdAt", user.getCreatedAt());

        // Profile Fields
        profile.put("currentCompany", user.getCurrentCompany());
        profile.put("experienceYears", user.getExperienceYears());
        profile.put("education", user.getEducation());
        profile.put("skills", user.getSkills());
        profile.put("pastExperience", user.getPastExperience());
        profile.put("resumeUrl", user.getResumeUrl());
        profile.put("countryCode", user.getCountryCode());
        profile.put("mobileNumber", user.getMobileNumber());

        return ResponseEntity.ok(profile);
    }

    @GetMapping("/candidates")
    public ResponseEntity<?> getCandidates() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String authority = auth.getAuthorities().iterator().next().getAuthority();
        System.out.println("DEBUG: User checking candidates. Authority: " + authority);

        // Check for both with and without ROLE_ prefix
        if (authority.equals("ROLE_ADMIN") || authority.equals("ROLE_RECRUITER") ||
                authority.equals("ADMIN") || authority.equals("RECRUITER")) {
            return ResponseEntity.ok(authServiceClient.getUsersByRole("CANDIDATE"));
        }
        return ResponseEntity.status(403).body("Access denied: Only Admin and Recruiters can see candidates.");
    }

    @GetMapping("/recruiters")
    public ResponseEntity<?> getRecruiters() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String role = auth.getAuthorities().iterator().next().getAuthority();

        if (role.equals("ROLE_ADMIN")) {
            return ResponseEntity.ok(authServiceClient.getUsersByRole("RECRUITER"));
        }
        return ResponseEntity.status(403).body("Access denied: Only Admins can see recruiters.");
    }

    @GetMapping("/all")
    public ResponseEntity<?> getAllUsers() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String role = auth.getAuthorities().iterator().next().getAuthority();

        if (role.equals("ROLE_ADMIN")) {
            return ResponseEntity.ok(authServiceClient.getAllUsers());
        }
        return ResponseEntity.status(403).body("Access denied: Only Admins can see all users.");
    }

    @GetMapping("/test")
    public ResponseEntity<?> testProtectedEndpoint() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Map<String, String> response = new HashMap<>();
        response.put("message", "This is a protected endpoint. Your current role is: " + auth.getAuthorities());
        return ResponseEntity.ok(response);
    }
}
