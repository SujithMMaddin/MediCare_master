package com.medicare.dto;

import com.medicare.entity.AppointmentStatus;
import com.medicare.entity.PaymentStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record AppointmentResponse(
        Long id,
        LocalDateTime appointmentDate,
        AppointmentStatus status,
        String reason,

        Long bookingAccountId,
        String bookingAccountName,
        String bookingAccountEmail,
        Long patientProfileId,
        String patientName,
        String patientRelationship,

        Long doctorId,
        String doctorName,
        String doctorEmail,
        Long specializationId,
        String specialization,

        LocalDateTime createdAt,
        LocalDateTime noShowEligibleAt,
        BigDecimal consultationFee,
        BigDecimal totalAmount,
        PaymentStatus paymentStatus,
        Long billingId,
        boolean scheduleConflict
) {
}
