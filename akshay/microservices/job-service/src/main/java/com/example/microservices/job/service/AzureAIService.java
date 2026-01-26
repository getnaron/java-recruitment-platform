package com.example.microservices.job.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class AzureAIService {

    @Value("${azure.openai.enabled:false}")
    private boolean enabled;

    @Value("${azure.openai.endpoint}")
    private String endpoint;

    @Value("${azure.openai.key}")
    private String apiKey;

    @Value("${azure.openai.deployment-name}")
    private String deploymentName;

    @Value("${azure.openai.api-version}")
    private String apiVersion;

    private final RestTemplate restTemplate = new RestTemplate();

    public boolean isEnabled() {
        return enabled;
    }

    /**
     * Asynchronously generates AI summary for a job application
     * This runs in background to avoid blocking the application submission
     * 
     * @param applicationId The application ID to update
     * @param pdfData       PDF resume data
     * @param fileName      Resume filename
     */
    @org.springframework.scheduling.annotation.Async
    public void summarizeResumeAsync(String applicationId, byte[] pdfData, String fileName,
            com.example.microservices.job.repository.JobApplicationRepository repository,
            com.example.microservices.job.repository.JobRepository jobRepository) {
        try {
            String summary = "AI summarization is currently disabled"; // Default value if AI is disabled
            Integer matchScore = null;

            if (enabled) {
                System.out.println(
                        "DEBUG: [ASYNC] Calling Azure AI to summarize resume for application: " + applicationId);
                summary = summarizeResume(pdfData, fileName);
                System.out.println("DEBUG: [ASYNC] AI Summary generated for application: " + applicationId);

                // Calculate match score
                var appOpt = repository.findById(applicationId);
                if (appOpt.isPresent()) {
                    var app = appOpt.get();
                    var jobOpt = jobRepository.findById(app.getJobId());
                    if (jobOpt.isPresent()) {
                        try {
                            System.out.println(
                                    "DEBUG: [ASYNC] Calculating match score for application: " + applicationId);
                            matchScore = calculateMatchScore(summary, jobOpt.get().getDescription());
                            System.out.println(
                                    "DEBUG: [ASYNC] Match score: " + matchScore + "% for application: "
                                            + applicationId);
                        } catch (Exception e) {
                            System.err.println("WARNING: [ASYNC] Failed to calculate match score: " + e.getMessage());
                            matchScore = 0;
                        }
                    }
                }
            } else {
                System.out.println("DEBUG: [ASYNC] AI summarization is disabled");
            }

            // Update the application with BOTH AI summary and score in single save
            final String finalSummary = summary;
            final Integer finalScore = matchScore;
            repository.findById(applicationId).ifPresent(app -> {
                app.setAiSummary(finalSummary);
                if (finalScore != null) {
                    app.setAiScore(finalScore);
                    System.out.println("DEBUG: [ASYNC] Saving application with summary and score: " + finalScore + "%");
                } else {
                    System.out.println("DEBUG: [ASYNC] Saving application with summary only (no score)");
                }
                repository.save(app);
                System.out.println("DEBUG: [ASYNC] Application " + applicationId + " saved successfully");
            });
        } catch (Exception e) {
            System.err.println("ERROR: [ASYNC] Failed to generate AI summary for application " + applicationId + ": "
                    + e.getMessage());
            // Update with error message
            repository.findById(applicationId).ifPresent(app -> {
                app.setAiSummary("Summary generation failed: " + e.getMessage());
                app.setAiScore(0);
                repository.save(app);
            });
        }
    }

    /**
     * Calculates match score between resume summary and job description
     * 
     * @param resumeSummary  AI-generated resume summary
     * @param jobDescription Job's detailed description
     * @return Match score as percentage (0-100)
     */
    public Integer calculateMatchScore(String resumeSummary, String jobDescription) {
        try {
            // Construct the request URL
            String url = String.format("%s/openai/deployments/%s/chat/completions?api-version=%s",
                    endpoint, deploymentName, apiVersion);

            // Build request headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("api-key", apiKey);

            // Build request body for scoring
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("messages", Arrays.asList(
                    Map.of(
                            "role", "system",
                            "content",
                            "You are an expert recruiter AI. Analyze how well a candidate's profile matches a job description. Return ONLY a number between 0-100 representing the match percentage. Consider skills, experience, and qualifications."),
                    Map.of(
                            "role", "user",
                            "content", String.format(
                                    "Job Description:\n%s\n\nCandidate Summary:\n%s\n\nWhat is the match percentage (0-100)?",
                                    jobDescription, resumeSummary))));
            requestBody.put("max_tokens", 50);
            requestBody.put("temperature", 0.1); // Low temperature for consistent scoring

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            // Make API call
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, request, Map.class);

            // Extract score from response
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = response.getBody();
                List<Map<String, Object>> choices = (List<Map<String, Object>>) body.get("choices");
                if (choices != null && !choices.isEmpty()) {
                    Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                    String content = (String) message.get("content");

                    // Extract number from response
                    String numberStr = content.trim().replaceAll("[^0-9]", "");
                    if (!numberStr.isEmpty()) {
                        int score = Integer.parseInt(numberStr);
                        return Math.min(100, Math.max(0, score)); // Clamp to 0-100
                    }
                }
            }

            System.out.println("Failed to calculate match score - unexpected response");
            return 50; // Default to 50% if parsing fails

        } catch (Exception e) {
            System.err.println("Error calculating match score: " + e.getMessage());
            return 50; // Default to 50% on error
        }
    }

    /**
     * Sends PDF resume to Azure AI for summarization
     * 
     * @param pdfData  PDF file as byte array
     * @param fileName Original filename for context
     * @return AI-generated summary
     */
    public String summarizeResume(byte[] pdfData, String fileName) {
        try {
            // Extract text from PDF
            System.out.println("Extracting text from PDF: " + fileName);
            String resumeText = com.example.microservices.job.util.ResumeUtil.extractTextFromPDF(pdfData);
            System.out.println("Extracted " + resumeText.length() + " characters from resume");

            // Construct the request URL
            String url = String.format("%s/openai/deployments/%s/chat/completions?api-version=%s",
                    endpoint, deploymentName, apiVersion);

            // Build request headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("api-key", apiKey);

            // Build request body - send text instead of PDF
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("messages", Arrays.asList(
                    Map.of(
                            "role", "system",
                            "content",
                            "You are a professional resume analyzer. Summarize the candidate's resume in 2-3 concise sentences highlighting key skills, experience, and qualifications."),
                    Map.of(
                            "role", "user",
                            "content", "Please analyze and summarize this resume:\n\n" + resumeText)));
            requestBody.put("max_tokens", 500);
            requestBody.put("temperature", 0.3);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            // Make API call
            System.out.println("Calling Azure AI for resume: " + fileName);
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, request, Map.class);

            // Extract summary from response
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = response.getBody();
                List<Map<String, Object>> choices = (List<Map<String, Object>>) body.get("choices");
                if (choices != null && !choices.isEmpty()) {
                    Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                    String summary = (String) message.get("content");
                    System.out.println("AI Summary generated successfully");
                    return summary.trim();
                }
            }

            System.out.println("Failed to generate summary - unexpected response format");
            return "Summary generation failed";

        } catch (Exception e) {
            System.err.println("Error calling Azure AI: " + e.getMessage());
            e.printStackTrace();
            return "Error generating summary: " + e.getMessage();
        }
    }
}
