package com.medicare.dto;

import com.medicare.entity.PaymentStatus;
import jakarta.validation.constraints.NotNull;

public record BillingStatusRequest(@NotNull PaymentStatus status) {
}
