package com.medicare.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ProfileUpdateRequest(
        @NotBlank @Size(min = 2, max = 100) String name,
        @NotBlank @Email @Size(max = 150) String email,
        @Size(max = 2048)
        @Pattern(regexp = "^(https?://[^\\s]+)?$", message = "Profile photo must be an http or https URL")
        String profilePhotoUrl
) {
}
