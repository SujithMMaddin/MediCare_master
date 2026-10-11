package com.medicare.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record AppointmentRequest(

        @NotNull
        Long doctorId,

        @NotNull
        Long patientProfileId,

        Long specializationId,

        @NotNull
        @Future
        LocalDateTime appointmentDate,

        @Size(max = 500)
        String reason
) {
}
