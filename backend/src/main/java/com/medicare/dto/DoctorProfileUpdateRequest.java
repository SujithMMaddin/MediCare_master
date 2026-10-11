package com.medicare.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record DoctorProfileUpdateRequest(
        @Size(max = 2048)
        @Pattern(regexp = "^(https?://[^\\s]+)?$", message = "Profile photo must be an http or https URL")
        String profilePhotoUrl,
        @Size(max = 2000) String bio,
        @Size(max = 500) String qualifications,
        @Min(0) @Max(80) Integer experienceYears,
        @Size(max = 30)
        @Pattern(regexp = "^(\\+?[0-9][0-9 ()-]{6,28})?$", message = "Phone number must be valid")
        String phone
) {}
