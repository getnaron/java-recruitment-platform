package com.example.microservices.auth.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "premium_requests")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PremiumRequest {

    @Id
    private String id;

    private String userId;
    private String userEmail;
    private String userName;
    private String status; // PENDING, APPROVED, REJECTED
    private LocalDateTime requestedAt;
    private LocalDateTime processedAt;
    private String processedBy; // Admin email who processed it
}
