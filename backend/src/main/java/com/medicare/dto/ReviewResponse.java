package com.medicare.dto;

import java.time.LocalDateTime;

public record ReviewResponse(Long id, Long appointmentId, Long doctorId, String doctorName, String patientName,
        int rating, String comment, boolean approved, LocalDateTime createdAt) {}
