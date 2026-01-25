package com.example.microservices.auth.service;

import com.example.microservices.auth.dto.AuthResponse;
import com.example.microservices.auth.dto.LoginRequest;
import com.example.microservices.auth.dto.RegisterRequest;
import com.example.microservices.auth.model.User;
import com.example.microservices.auth.repository.UserRepository;
import com.example.microservices.auth.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private AuthenticationManager authenticationManager;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists!");
        }

        User user = new User();
        user.setEmail(request.getEmail().toLowerCase().trim());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());

        // Default role to CANDIDATE if not provided
        String role = (request.getRole() != null && !request.getRole().isEmpty())
                ? request.getRole().toUpperCase()
                : "CANDIDATE";
        user.setRole(role);

        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole());

        AuthResponse response = new AuthResponse(token, user.getEmail(), user.getFirstName(), user.getLastName(),
                user.getRole());
        response.setCurrentCompany(user.getCurrentCompany());
        response.setExperienceYears(user.getExperienceYears());
        response.setEducation(user.getEducation());
        response.setSkills(user.getSkills());
        response.setPastExperience(user.getPastExperience());
        response.setResumeUrl(user.getResumeUrl());
        response.setCountryCode(user.getCountryCode());
        response.setMobileNumber(user.getMobileNumber());
        response.setPremium(user.isPremium());

        return response;
    }

    public AuthResponse login(LoginRequest request) {
        // 1. Fetch user first to check lock status
        User user = userRepository.findByEmailIgnoreCase(request.getEmail().toLowerCase().trim())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // 2. Check if account is locked
        if (user.isLocked()) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "Account is locked. Please contact admin.");
        }

        // 3. Authenticate
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole());

        AuthResponse response = new AuthResponse(token, user.getEmail(), user.getFirstName(), user.getLastName(),
                user.getRole());
        response.setCurrentCompany(user.getCurrentCompany());
        response.setExperienceYears(user.getExperienceYears());
        response.setEducation(user.getEducation());
        response.setSkills(user.getSkills());
        response.setPastExperience(user.getPastExperience());
        response.setResumeUrl(user.getResumeUrl());
        response.setCountryCode(user.getCountryCode());
        response.setMobileNumber(user.getMobileNumber());
        response.setPremium(user.isPremium());

        return response;
    }

    public User getUserByEmail(String email) {
        if (email == null)
            return null;
        return userRepository.findByEmailIgnoreCase(email.toLowerCase().trim())
                .orElse(null);
    }

    public List<User> getUsersByRole(String role) {
        return userRepository.findByRole(role.toUpperCase());
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User updateUser(String email, User updatedUser) {
        User user = getUserByEmail(email);

        if (updatedUser.getFirstName() != null)
            user.setFirstName(updatedUser.getFirstName());
        if (updatedUser.getLastName() != null)
            user.setLastName(updatedUser.getLastName());
        if (updatedUser.getCurrentCompany() != null)
            user.setCurrentCompany(updatedUser.getCurrentCompany());
        if (updatedUser.getExperienceYears() != null)
            user.setExperienceYears(updatedUser.getExperienceYears());
        if (updatedUser.getPastExperience() != null)
            user.setPastExperience(updatedUser.getPastExperience());
        if (updatedUser.getEducation() != null)
            user.setEducation(updatedUser.getEducation());
        if (updatedUser.getSkills() != null)
            user.setSkills(updatedUser.getSkills());
        if (updatedUser.getResumeUrl() != null && !updatedUser.getResumeUrl().isEmpty())
            user.setResumeUrl(updatedUser.getResumeUrl());
        if (updatedUser.getResumeData() != null && updatedUser.getResumeData().length > 0)
            user.setResumeData(updatedUser.getResumeData());
        if (updatedUser.getResumeContentType() != null)
            user.setResumeContentType(updatedUser.getResumeContentType());

        if (updatedUser.getCountryCode() != null)
            user.setCountryCode(updatedUser.getCountryCode());
        if (updatedUser.getMobileNumber() != null)
            user.setMobileNumber(updatedUser.getMobileNumber());

        return userRepository.save(user);
    }

    public User deleteResume(String email) {
        User user = getUserByEmail(email);
        user.setResumeUrl(null);
        user.setResumeData(null);
        user.setResumeContentType(null);
        return userRepository.save(user);
    }

    public User upgradeToPremium(String email) {
        User user = getUserByEmail(email);
        if (user != null) {
            user.setPremium(true);
            return userRepository.save(user);
        }
        return null;
    }

    public User toggleUserLock(String email) {
        User user = getUserByEmail(email);
        if (user != null) {
            user.setLocked(!user.isLocked());
            return userRepository.save(user);
        }
        return null;
    }

    public User setUserPremiumStatus(String email, boolean isPremium) {
        User user = getUserByEmail(email);
        if (user != null) {
            user.setPremium(isPremium);
            return userRepository.save(user);
        }
        return null;
    }
}
