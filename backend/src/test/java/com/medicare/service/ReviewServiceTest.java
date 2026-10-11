package com.medicare.service;

import com.medicare.dto.ReviewRequest;
import com.medicare.entity.*;
import com.medicare.exception.UnauthorizedAccessException;
import com.medicare.repository.*;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ReviewServiceTest {
    @Test
    void onlyCompletedOwnedAppointmentsCanBeReviewedAndReviewsStartUnapproved() {
        User patient = new User("Pat Example", "patient@example.test", "encoded", Role.PATIENT);
        patient.setId(3L);
        User doctorUser = new User("Dr. Example", "doctor@example.test", "encoded", Role.DOCTOR);
        doctorUser.setId(7L);
        Doctor doctor = new Doctor(doctorUser, new Specialization("Cardiology"));
        doctor.setId(2L);
        Appointment appointment = mock(Appointment.class);
        when(appointment.getId()).thenReturn(9L);
        when(appointment.getBookedBy()).thenReturn(patient);
        when(appointment.getDoctor()).thenReturn(doctor);
        when(appointment.getStatus()).thenReturn(AppointmentStatus.COMPLETED);

        UserRepository users = mock(UserRepository.class);
        AppointmentRepository appointments = mock(AppointmentRepository.class);
        DoctorReviewRepository reviews = mock(DoctorReviewRepository.class);
        when(users.findByEmail(patient.getEmail())).thenReturn(Optional.of(patient));
        when(appointments.findById(9L)).thenReturn(Optional.of(appointment));
        when(reviews.save(any(DoctorReview.class))).thenAnswer(invocation -> invocation.getArgument(0));
        ReviewService service = new ReviewService(users, appointments, reviews);

        var result = service.create(patient.getEmail(), 9L, new ReviewRequest(5, "Excellent care"));

        assertEquals(5, result.rating());
        assertFalse(result.approved());
        assertEquals("Pat Example", result.patientName());
    }

    @Test
    void cannotReviewAnotherAccountsAppointment() {
        User owner = new User("Owner", "owner@example.test", "encoded", Role.PATIENT);
        User stranger = new User("Stranger", "stranger@example.test", "encoded", Role.PATIENT);
        owner.setId(1L);
        stranger.setId(2L);
        Appointment appointment = mock(Appointment.class);
        when(appointment.getBookedBy()).thenReturn(owner);
        UserRepository users = mock(UserRepository.class);
        AppointmentRepository appointments = mock(AppointmentRepository.class);
        when(users.findByEmail(stranger.getEmail())).thenReturn(Optional.of(stranger));
        when(appointments.findById(9L)).thenReturn(Optional.of(appointment));
        ReviewService service = new ReviewService(users, appointments, mock(DoctorReviewRepository.class));

        assertThrows(UnauthorizedAccessException.class,
                () -> service.create(stranger.getEmail(), 9L, new ReviewRequest(4, null)));
    }
}
