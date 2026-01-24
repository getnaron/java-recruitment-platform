package com.example.microservices.auth.controller;

import com.example.microservices.auth.model.User;
import com.example.microservices.auth.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/auth/profile")
public class ProfileController {

    @Autowired
    private AuthService authService;

    @PutMapping
    public ResponseEntity<?> updateProfile(@RequestBody User userUpdates) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        User updatedUser = authService.updateUser(email, userUpdates);
        return ResponseEntity.ok(updatedUser);
    }

    @PostMapping("/resume")
    public ResponseEntity<?> uploadResume(@RequestParam("file") MultipartFile file) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        System.out.println("DEBUG: uploadResume called for " + email + ". File size: " + file.getSize());

        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body("Cannot upload empty file");
            }

            User userUpdates = new User();
            userUpdates.setResumeData(file.getBytes());
            userUpdates.setResumeContentType(file.getContentType());
            userUpdates.setResumeUrl(file.getOriginalFilename());

            User savedUser = authService.updateUser(email, userUpdates);
            return ResponseEntity.ok(savedUser);
        } catch (IOException ex) {
            ex.printStackTrace();
            return ResponseEntity.badRequest().body("Could not upload file " + ex.getMessage());
        }
    }

    @GetMapping("/resume/{fileName:.+}")
    public ResponseEntity<Resource> downloadResume(@PathVariable String fileName,
            @RequestParam(required = false, defaultValue = "false") boolean view) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String email = auth.getName();
            User user = authService.getUserByEmail(email);

            User targetUser = null;

            // Try current user first
            if (user != null && fileName.equals(user.getResumeUrl())) {
                targetUser = user;
            } else {
                // Try to find the user by resume filename fallback for recruiters
                java.util.List<User> allUsers = authService.getAllUsers();
                for (User u : allUsers) {
                    if (fileName.equals(u.getResumeUrl())) {
                        targetUser = u;
                        break;
                    }
                }
            }

            if (targetUser != null && targetUser.getResumeData() != null) {
                String disposition = view ? "inline" : "attachment";

                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(
                                targetUser.getResumeContentType() != null ? targetUser.getResumeContentType()
                                        : "application/pdf"))
                        .header(HttpHeaders.CONTENT_DISPOSITION,
                                disposition + "; filename=\"" + targetUser.getResumeUrl() + "\"")
                        .body(new org.springframework.core.io.ByteArrayResource(targetUser.getResumeData()));
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception ex) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/resume")
    public ResponseEntity<?> deleteResume() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        User updatedUser = authService.deleteResume(email);
        return ResponseEntity.ok(updatedUser);
    }

    // Internal endpoint for other microservices
    @GetMapping("/internal/resume/{email}")
    public ResponseEntity<byte[]> getInternalResume(@PathVariable String email) {
        User user = authService.getUserByEmail(email);
        if (user != null && user.getResumeData() != null) {
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(
                            user.getResumeContentType() != null ? user.getResumeContentType() : "application/pdf"))
                    .body(user.getResumeData());
        }
        return ResponseEntity.notFound().build();
    }
}
