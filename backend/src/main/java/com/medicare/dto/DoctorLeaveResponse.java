package com.medicare.dto;

import com.medicare.entity.DoctorLeaveStatus;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record DoctorLeaveResponse(
        Long id,
        Long doctorId,
        String doctorName,
        LocalDate startDate,
        LocalDate endDate,
        String reason,
        DoctorLeaveStatus status,
        String adminComment,
        LocalDateTime createdAt,
        LocalDateTime decidedAt
) {}
