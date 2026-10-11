package com.medicare.dto;

import com.medicare.entity.PaymentStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record BillingResponse(
        Long id,
        Long appointmentId,
        BigDecimal amount,
        String currency,
        PaymentStatus status,
        LocalDateTime createdAt,
        LocalDateTime paidAt,
        LocalDateTime refundedAt
) {
}
