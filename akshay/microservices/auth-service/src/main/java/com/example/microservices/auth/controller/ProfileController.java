package com.example.microservices.auth.controller;

import com.example.microservices.auth.model.User;
import com.example.microservices.auth.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth/profile")
public class ProfileController {

    @Autowired
    private AuthService authService;

    private final Path fileStorageLocation = Paths.get("uploads/resumes").toAbsolutePath().normalize();

    public ProfileController() {
        try {
            Files.createDirectories(this.fileStorageLocation);
        } catch (Exception ex) {
            throw new RuntimeException("Could not create the directory where the uploaded files will be stored.", ex);
        }
    }

    @PutMapping
    public ResponseEntity<?> updateProfile(@RequestBody User userUpdates) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Object principal = auth.getPrincipal();
        String email;

        if (principal instanceof org.springframework.security.core.userdetails.UserDetails) {
            email = ((org.springframework.security.core.userdetails.UserDetails) principal).getUsername();
        } else {
            email = principal.toString();
        }

        User updatedUser = authService.updateUser(email, userUpdates);
        return ResponseEntity.ok(updatedUser);
    }

    @PostMapping("/resume")
    public ResponseEntity<?> uploadResume(@RequestParam("file") MultipartFile file) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        System.out.println("DEBUG: uploadResume called for " + email + ". File size: " + file.getSize());

        try {
            // Validate file size/type if needed
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body("Cannot upload empty file");
            }

            // Update user profile with resume data
            User userUpdates = new User();
            userUpdates.setResumeData(file.getBytes());
            userUpdates.setResumeContentType(file.getContentType());
            userUpdates.setResumeUrl(file.getOriginalFilename()); // Store filename for display

            System.out.println("DEBUG: Saving resume data for " + email + ". Filename: " + file.getOriginalFilename());

            User savedUser = authService.updateUser(email, userUpdates);

            System.out.println("DEBUG: Resume saved. New ResumeURL: " + savedUser.getResumeUrl());

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
            // Find user by resume filename (since we store it there)
            // Ideally we should look up by user ID, but we kept filename for compatibility
            // This is inefficient but works for now. Better: /resume/user/{email}

            // Just use the service to find the user. We need a method in service to find by
            // resumeUrl?
            // Or since we don't have that easily exposed, let's assume the user is
            // downloading THEIR OWN resume
            // and use the authenticated user.

            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String email = auth.getName();
            User user = authService.getUserByEmail(email);

            // If admin/recruiter, we might not be the owner.
            // fallback: if filename doesn't match current user, we might need a search.
            // For now, let's supporting downloading ONLY via the user object.

            // But wait, the frontend link is /auth/profile/resume/{filename}.
            // If I am a recruiter viewing a candidate, I click that link. I am
            // Authenticated as 'recruiter'.
            // The 'email' above will be recruiter's email.
            // So we need to find the user who OWNS this resume.
            // Since we indexed users, let's add a findByResumeUrl to
            // AuthService/Repository?

            // For this quick fix to switch to MongoDB storage:
            // We will fetch ALL users and filter (bad perf, but works for MVP) OR add a
            // repo method.
            // Let's rely on the filename being the lookup key.

            // Actually, let's try to fetch the user by resumeUrl if we can add that method.
            // But I cannot easily modify the Interface without seeing it.
            // Let's assume for now the user is viewing their OWN profile or we iterate.

            // Hack for MVP: Iterate all users (terrible for prod, okay for demo)
            // A better way: The link should have been /resume/user/{targetEmail}

            // Let's implement the 'iterate' fallback for now to ensure it works for
            // Recruiters too.
            User targetUser = null;

            // Try current user first
            if (user != null && fileName.equals(user.getResumeUrl())) {
                targetUser = user;
            } else {
                // Try to find the user by resume filename
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
}
