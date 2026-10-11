package com.medicare.dto;

import com.medicare.entity.FeeRequestStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record FeeChangeRequestResponse(Long id, Long doctorId, String doctorName, BigDecimal proposedFee,
        String reason, FeeRequestStatus status, String adminComment, LocalDateTime createdAt, LocalDateTime decidedAt) {}
