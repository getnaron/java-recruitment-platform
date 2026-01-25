package com.example.microservices.auth.repository;

import com.example.microservices.auth.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmailIgnoreCase(String email);

    Boolean existsByEmail(String email);

    List<User> findByRole(String role);
}
