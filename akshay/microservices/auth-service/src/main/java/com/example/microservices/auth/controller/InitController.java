package com.example.microservices.auth.controller;

import com.example.microservices.auth.model.User;
import com.example.microservices.auth.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/auth/init")
public class InitController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @PostMapping("/create-admin")
    public ResponseEntity<?> createAdminUser() {
        try {
            // Check if admin already exists
            if (userRepository.findByEmailIgnoreCase("admin").isPresent()) {
                return ResponseEntity.badRequest().body("Admin user already exists!");
            }

            // Create admin user
            User admin = new User();
            admin.setEmail("admin");
            admin.setPassword(passwordEncoder.encode("admin"));
            admin.setFirstName("Admin");
            admin.setLastName("User");
            admin.setRole("ADMIN");
            admin.setPremium(true);
            admin.setLocked(false);

            User savedAdmin = userRepository.save(admin);

            return ResponseEntity
                    .ok("✅ Admin user created successfully!\nEmail: admin\nPassword: admin\nRole: ADMIN\nID: "
                            + savedAdmin.getId());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error creating admin: " + e.getMessage());
        }
    }
}
