package com.medicare.dto;

import java.time.LocalDateTime;
import java.math.BigDecimal;

public record DoctorResponse(
        Long id,
        Long userId,
        String name,
        String email,
        Long specializationId,
        String specialization,
        BigDecimal consultationFee,
        LocalDateTime createdAt,
        String profilePhotoUrl,
        String bio,
        String qualifications,
        Integer experienceYears,
        String phone,
        boolean active,
        boolean scheduleConfigured,
        Double averageRating,
        long reviewCount
) {
}
