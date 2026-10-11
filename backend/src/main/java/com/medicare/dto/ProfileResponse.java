package com.medicare.dto;

import com.medicare.entity.Role;
import java.math.BigDecimal;
import java.util.List;

public record ProfileResponse(
        Long id,
        String name,
        String email,
        String profilePhotoUrl,
        Role role,
        Long doctorId,
        String specialization,
        BigDecimal consultationFee,
        List<AvailabilityResponse> schedule,
        String bio,
        String qualifications,
        Integer experienceYears,
        String phone,
        boolean active,
        Double averageRating,
        long reviewCount
) {
}
