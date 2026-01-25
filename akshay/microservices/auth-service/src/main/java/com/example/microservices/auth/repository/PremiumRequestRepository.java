package com.example.microservices.auth.repository;

import com.example.microservices.auth.model.PremiumRequest;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface PremiumRequestRepository extends MongoRepository<PremiumRequest, String> {
    List<PremiumRequest> findByStatus(String status);

    Optional<PremiumRequest> findByUserIdAndStatus(String userId, String status);

    List<PremiumRequest> findByUserEmail(String userEmail);
}
