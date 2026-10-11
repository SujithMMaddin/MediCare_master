package com.medicare.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.DayOfWeek;
import java.time.LocalTime;

public record AvailabilityRequest(

        @NotNull(message = "Day is required")
        DayOfWeek dayOfWeek,

        @NotNull(message = "Start time is required")
        LocalTime startTime,

        @NotNull(message = "End time is required")
        LocalTime endTime,

        @NotNull(message = "Slot duration is required")
        @Min(value = 15, message = "Slot duration must be at least 15 minutes")
        @Max(value = 120, message = "Slot duration cannot exceed 120 minutes")
        Integer slotDurationMinutes
) {
}