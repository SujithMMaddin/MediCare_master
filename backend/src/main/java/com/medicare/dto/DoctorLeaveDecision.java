package com.medicare.dto;

import com.medicare.entity.DoctorLeaveStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record DoctorLeaveDecision(@NotNull DoctorLeaveStatus status, @Size(max = 500) String comment) {}
