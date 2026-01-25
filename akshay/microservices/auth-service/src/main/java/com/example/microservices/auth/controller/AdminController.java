package com.example.microservices.auth.controller;

import com.example.microservices.auth.model.PremiumRequest;
import com.example.microservices.auth.model.User;
import com.example.microservices.auth.repository.PremiumRequestRepository;
import com.example.microservices.auth.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth/admin")
public class AdminController {

    @Autowired
    private AuthService authService;

    @Autowired
    private PremiumRequestRepository premiumRequestRepository;

    // Get all pending premium requests
    @GetMapping("/premium-requests")
    public ResponseEntity<?> getPendingPremiumRequests() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User admin = authService.getUserByEmail(auth.getName());

        if (admin == null || !"ADMIN".equals(admin.getRole())) {
            return ResponseEntity.status(403).body("Admin access required");
        }

        List<PremiumRequest> requests = premiumRequestRepository.findByStatus("PENDING");
        return ResponseEntity.ok(requests);
    }

    // Approve premium request
    @PostMapping("/premium-requests/{requestId}/approve")
    public ResponseEntity<?> approvePremiumRequest(@PathVariable String requestId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User admin = authService.getUserByEmail(auth.getName());

        if (admin == null || !"ADMIN".equals(admin.getRole())) {
            return ResponseEntity.status(403).body("Admin access required");
        }

        PremiumRequest request = premiumRequestRepository.findById(requestId).orElse(null);
        if (request == null) {
            return ResponseEntity.notFound().build();
        }

        // Update user to premium
        User user = authService.setUserPremiumStatus(request.getUserEmail(), true);

        // Update request status
        request.setStatus("APPROVED");
        request.setProcessedAt(LocalDateTime.now());
        request.setProcessedBy(admin.getEmail());
        premiumRequestRepository.save(request);

        return ResponseEntity.ok(user);
    }

    // Reject premium request
    @PostMapping("/premium-requests/{requestId}/reject")
    public ResponseEntity<?> rejectPremiumRequest(@PathVariable String requestId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User admin = authService.getUserByEmail(auth.getName());

        if (admin == null || !"ADMIN".equals(admin.getRole())) {
            return ResponseEntity.status(403).body("Admin access required");
        }

        PremiumRequest request = premiumRequestRepository.findById(requestId).orElse(null);
        if (request == null) {
            return ResponseEntity.notFound().build();
        }

        request.setStatus("REJECTED");
        request.setProcessedAt(LocalDateTime.now());
        request.setProcessedBy(admin.getEmail());
        premiumRequestRepository.save(request);

        return ResponseEntity.ok(request);
    }

    // Toggle user lock status
    @PostMapping("/users/{email}/toggle-lock")
    public ResponseEntity<?> toggleUserLock(@PathVariable String email) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User admin = authService.getUserByEmail(auth.getName());

        if (admin == null || !"ADMIN".equals(admin.getRole())) {
            return ResponseEntity.status(403).body("Admin access required");
        }

        User user = authService.toggleUserLock(email);
        if (user != null) {
            return ResponseEntity.ok(user);
        }
        return ResponseEntity.notFound().build();
    }

    // Set user premium status
    @PostMapping("/users/{email}/premium")
    public ResponseEntity<?> setUserPremium(@PathVariable String email, @RequestParam boolean isPremium) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User admin = authService.getUserByEmail(auth.getName());

        if (admin == null || !"ADMIN".equals(admin.getRole())) {
            return ResponseEntity.status(403).body("Admin access required");
        }

        User user = authService.setUserPremiumStatus(email, isPremium);
        if (user != null) {
            return ResponseEntity.ok(user);
        }
        return ResponseEntity.notFound().build();
    }

    // Get all users with their status
    @GetMapping("/users")
    public ResponseEntity<?> getAllUsersWithStatus() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User admin = authService.getUserByEmail(auth.getName());

        if (admin == null || !"ADMIN".equals(admin.getRole())) {
            return ResponseEntity.status(403).body("Admin access required");
        }

        List<User> users = authService.getAllUsers();
        return ResponseEntity.ok(users);
    }
}
