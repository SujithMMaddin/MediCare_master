package com.medicare.dto;

import java.time.DayOfWeek;
import java.time.LocalTime;

public record AvailabilityResponse(

        Long id,
        Long doctorId,
        DayOfWeek dayOfWeek,
        LocalTime startTime,
        LocalTime endTime,
        Integer slotDurationMinutes
) {
}