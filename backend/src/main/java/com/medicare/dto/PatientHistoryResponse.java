package com.medicare.dto;
import com.medicare.entity.AppointmentStatus;
import com.medicare.entity.PatientRelationship;
import java.time.LocalDate;
import java.time.LocalDateTime;
public record PatientHistoryResponse(Long patientProfileId, String patientName, LocalDate dateOfBirth,
        PatientRelationship relationship, LocalDateTime appointmentDate, AppointmentStatus appointmentStatus,
        String doctorName, String specialization, String clinicalInformation) {}
