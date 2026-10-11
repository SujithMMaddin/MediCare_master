package com.medicare.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record FeeRequest(
        @NotNull(message = "Consultation fee is required")
        @DecimalMin(value = "0.01", message = "Consultation fee must be greater than zero")
        @Digits(integer = 8, fraction = 2, message = "Consultation fee can have at most two decimal places")
        BigDecimal consultationFee
) {
}
