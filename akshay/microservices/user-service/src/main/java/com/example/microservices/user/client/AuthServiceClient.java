package com.example.microservices.user.client;

import com.example.microservices.user.model.User;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "auth-service")
public interface AuthServiceClient {
    
    @GetMapping("/api/auth/internal/user/{email}")
    User getUserByEmail(@PathVariable("email") String email);
}
