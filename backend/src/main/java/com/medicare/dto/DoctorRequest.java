package com.medicare.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;

public record DoctorRequest(

        @NotBlank(message = "Doctor name is required")
        @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
        String name,

        @NotBlank(message = "Doctor email is required")
        @Email(message = "Doctor email must be valid")
        @Size(max = 150)
        String email,

        @Size(max = 100)
        @Pattern(regexp = "^(|.{6,100})$", message = "Password must be empty or between 6 and 100 characters")
        String password,

        @NotNull(message = "Specialization is required")
        Long specializationId
) {
}