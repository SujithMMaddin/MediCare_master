package com.medicare.dto;

import com.medicare.entity.PatientRelationship;
import java.time.LocalDate;

public record PatientProfileResponse(Long id, String fullName, LocalDate dateOfBirth,
                                     PatientRelationship relationship, boolean self) {}
