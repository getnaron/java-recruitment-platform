package com.example.microservices.job.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.http.ResponseEntity;

@FeignClient(name = "auth-service")
public interface AuthServiceClient {

    @GetMapping("/api/auth/profile/internal/resume/{email}")
    ResponseEntity<byte[]> getInternalResume(@PathVariable("email") String email);
}
