package com.medicare.dto;

import java.time.LocalDate;
import java.time.LocalTime;

public record AvailableSlotResponse(
        LocalDate date,
        LocalTime time
) {
}