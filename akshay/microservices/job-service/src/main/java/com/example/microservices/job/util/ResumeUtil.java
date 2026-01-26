package com.example.microservices.job.util;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import java.io.ByteArrayInputStream;
import java.io.IOException;

public class ResumeUtil {

    /**
     * Extracts text content from a PDF byte array
     * 
     * @param pdfData PDF file as byte array
     * @return Extracted text content
     * @throws IOException if PDF reading fails
     */
    public static String extractTextFromPDF(byte[] pdfData) throws IOException {
        if (pdfData == null || pdfData.length == 0) {
            throw new IllegalArgumentException("PDF data is null or empty");
        }

        try (ByteArrayInputStream inputStream = new ByteArrayInputStream(pdfData);
                PDDocument document = PDDocument.load(inputStream)) {

            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(document);

            // Remove excessive whitespace and limit length for API
            text = text.replaceAll("\\s+", " ").trim();

            // Limit to ~4000 characters to stay within token limits
            if (text.length() > 4000) {
                text = text.substring(0, 4000) + "...";
            }

            return text;
        }
    }
}
