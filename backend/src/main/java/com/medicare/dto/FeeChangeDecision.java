package com.medicare.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import com.medicare.entity.FeeRequestStatus;

public record FeeChangeDecision(@NotNull FeeRequestStatus status, @Size(max = 1000) String comment) {}
