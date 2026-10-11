package com.medicare.dto;

import com.medicare.entity.PatientRelationship;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record PatientProfileRequest(
        @NotBlank @Size(max = 120) String fullName,
        @NotNull @Past LocalDate dateOfBirth,
        @NotNull PatientRelationship relationship
) {}
