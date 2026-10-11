package com.medicare.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public record RescheduleRequest(@NotNull LocalDateTime appointmentDate) {}
