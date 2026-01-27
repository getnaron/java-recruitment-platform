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
import org.bson.types.ObjectId;

import org.springframework.data.mongodb.gridfs.GridFsTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Criteria;
import com.mongodb.client.gridfs.model.GridFSFile;
import org.springframework.data.mongodb.gridfs.GridFsResource;

@RestController
@RequestMapping("/api/auth/profile")
public class ProfileController {

    @Autowired
    private AuthService authService;

    @Autowired
    private GridFsTemplate gridFsTemplate;

    @GetMapping
    public ResponseEntity<?> getProfile() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        User user = authService.getUserByEmail(email);
        if (user != null) {
            return ResponseEntity.ok(user);
        }
        return ResponseEntity.notFound().build();
    }

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

    @PostMapping("/picture")
    public ResponseEntity<?> uploadProfilePicture(@RequestParam("file") MultipartFile file) {
        System.out.println("DEBUG: uploadProfilePicture called: " + file.getOriginalFilename());
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body("Cannot upload empty file");
            }

            String filename = file.getOriginalFilename();
            if (filename != null
                    && (filename.toLowerCase().endsWith(".heic") || filename.toLowerCase().endsWith(".heif"))) {
                return ResponseEntity.badRequest()
                        .body("HEIC/HEIF format is not supported by browsers. Please upload a JPG or PNG image.");
            }

            User existingUser = authService.getUserByEmail(email);

            // Delete old picture if exists
            if (existingUser.getProfilePictureId() != null) {
                gridFsTemplate
                        .delete(new Query(Criteria.where("_id").is(new ObjectId(existingUser.getProfilePictureId()))));
            }

            // Save new picture to GridFS
            org.bson.types.ObjectId fileId = gridFsTemplate.store(file.getInputStream(), file.getOriginalFilename(),
                    file.getContentType());

            User userUpdates = new User();
            userUpdates.setProfilePictureId(fileId.toString());
            userUpdates.setProfilePictureContentType(file.getContentType());
            userUpdates.setProfilePictureUrl("/api/auth/profile/picture/" + email);

            User savedUser = authService.updateUser(email, userUpdates);
            return ResponseEntity.ok(savedUser);
        } catch (IOException ex) {
            ex.printStackTrace();
            return ResponseEntity.badRequest().body("Could not upload file " + ex.getMessage());
        }
    }

    @GetMapping("/picture/{email:.+}")
    public ResponseEntity<Resource> getProfilePicture(@PathVariable String email) {
        System.out.println("DEBUG: getProfilePicture called for " + email);
        User user = authService.getUserByEmail(email);

        if (user != null && user.getProfilePictureId() != null) {
            System.out.println("DEBUG: Found picture ID: " + user.getProfilePictureId());
            GridFSFile gridFSFile = null;
            try {
                gridFSFile = gridFsTemplate
                        .findOne(new Query(Criteria.where("_id").is(new ObjectId(user.getProfilePictureId()))));
            } catch (IllegalArgumentException e) {
                System.out.println("DEBUG: Invalid ObjectId: " + user.getProfilePictureId());
            }

            if (gridFSFile != null) {
                GridFsResource resource = gridFsTemplate.getResource(gridFSFile);
                String contentType = user.getProfilePictureContentType();
                System.out.println("DEBUG: Serving content type: " + contentType);

                return ResponseEntity.ok()
                        .header(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate")
                        .contentType(MediaType.parseMediaType(
                                contentType != null ? contentType : "image/jpeg"))
                        .body(resource);
            }
        }
        return ResponseEntity.notFound().build();
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
    @GetMapping("/internal/resume/{email:.+}")
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

    @PostMapping("/premium")
    public ResponseEntity<?> upgradeToPremium() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        User updatedUser = authService.upgradeToPremium(email);
        if (updatedUser != null) {
            return ResponseEntity.ok(updatedUser);
        }
        return ResponseEntity.badRequest().body("Failed to upgrade user.");
    }

    @PostMapping("/premium/{email}")
    public ResponseEntity<?> upgradeToPremiumByEmail(@PathVariable String email) {
        User updatedUser = authService.upgradeToPremium(email);
        if (updatedUser != null) {
            return ResponseEntity.ok(updatedUser);
        }
        return ResponseEntity.badRequest().body("Failed to upgrade user.");
    }

    @Autowired
    private com.example.microservices.auth.repository.PremiumRequestRepository premiumRequestRepository;

    @PostMapping("/premium-request")
    public ResponseEntity<?> requestPremium() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        User user = authService.getUserByEmail(email);

        if (user == null) {
            return ResponseEntity.badRequest().body("User not found");
        }

        // Check if already premium
        if (user.isPremium()) {
            return ResponseEntity.badRequest().body("Already a premium user");
        }

        // Check if there's already a pending request
        java.util.Optional<com.example.microservices.auth.model.PremiumRequest> existingRequest = premiumRequestRepository
                .findByUserIdAndStatus(user.getId(), "PENDING");

        if (existingRequest.isPresent()) {
            return ResponseEntity.badRequest().body("You already have a pending premium request");
        }

        // Create new premium request
        com.example.microservices.auth.model.PremiumRequest request = new com.example.microservices.auth.model.PremiumRequest();
        request.setUserId(user.getId());
        request.setUserEmail(user.getEmail());
        request.setUserName(user.getFirstName() + " " + user.getLastName());
        request.setStatus("PENDING");
        request.setRequestedAt(java.time.LocalDateTime.now());

        premiumRequestRepository.save(request);

        return ResponseEntity.ok(request);
    }

    @GetMapping("/premium-request-status")
    public ResponseEntity<?> checkPremiumRequestStatus() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        User user = authService.getUserByEmail(email);

        if (user == null) {
            return ResponseEntity.badRequest().body("User not found");
        }

        // Check if there's a pending request
        java.util.Optional<com.example.microservices.auth.model.PremiumRequest> pendingRequest = premiumRequestRepository
                .findByUserIdAndStatus(user.getId(), "PENDING");

        java.util.Map<String, Boolean> response = new java.util.HashMap<>();
        response.put("hasPendingRequest", pendingRequest.isPresent());
        response.put("isPremium", user.isPremium());

        return ResponseEntity.ok(response);
    }
}
