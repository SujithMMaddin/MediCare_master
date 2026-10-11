package com.medicare.dto;

import jakarta.validation.constraints.NotNull;

public record DoctorStatusRequest(@NotNull Boolean active) {}
