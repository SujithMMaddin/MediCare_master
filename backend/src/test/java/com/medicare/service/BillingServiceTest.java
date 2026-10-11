package com.medicare.service;

import com.medicare.entity.Appointment;
import com.medicare.entity.BillingRecord;
import com.medicare.entity.PaymentStatus;
import com.medicare.entity.Doctor;
import com.medicare.entity.Role;
import com.medicare.entity.Specialization;
import com.medicare.entity.User;
import com.medicare.exception.InvalidAppointmentException;
import com.medicare.exception.UnauthorizedAccessException;
import com.medicare.repository.AppointmentRepository;
import com.medicare.repository.BillingRecordRepository;
import com.medicare.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class BillingServiceTest {

    private BillingRecordRepository billingRepository;
    private BillingService billingService;
    private BillingRecord billingRecord;
    private UserRepository userRepository;
    private Appointment appointment;

    @BeforeEach
    void setUp() {
        billingRepository = mock(BillingRecordRepository.class);
        userRepository = mock(UserRepository.class);
        billingService = new BillingService(
                billingRepository, mock(AppointmentRepository.class), userRepository);
        billingRecord = mock(BillingRecord.class);
        appointment = mock(Appointment.class);
        when(appointment.getId()).thenReturn(12L);
        when(billingRecord.getAppointment()).thenReturn(appointment);
        when(billingRepository.findByAppointmentId(12L)).thenReturn(Optional.of(billingRecord));
        when(billingRepository.save(billingRecord)).thenReturn(billingRecord);
    }

    @Test
    void pendingPaymentCanBeMarkedPaid() {
        when(billingRecord.getStatus()).thenReturn(PaymentStatus.PENDING);

        billingService.updateStatus(12L, PaymentStatus.PAID);

        verify(billingRecord).setStatus(PaymentStatus.PAID);
        verify(billingRecord).setPaidAt(any());
        verify(billingRepository).save(billingRecord);
    }

    @Test
    void paidPaymentCanBeRefunded() {
        when(billingRecord.getStatus()).thenReturn(PaymentStatus.PAID);

        billingService.updateStatus(12L, PaymentStatus.REFUNDED);

        verify(billingRecord).setStatus(PaymentStatus.REFUNDED);
        verify(billingRecord).setRefundedAt(any());
    }

    @Test
    void invalidPaymentTransitionsAreRejected() {
        when(billingRecord.getStatus()).thenReturn(PaymentStatus.PENDING);

        assertThrows(InvalidAppointmentException.class,
                () -> billingService.updateStatus(12L, PaymentStatus.REFUNDED));
        verify(billingRepository, never()).save(any());
    }

    @Test
    void receiptContainsTheSnapshottedFeeAndIsLimitedToAppointmentOwner() {
        User owner = mock(User.class);
        when(owner.getId()).thenReturn(41L);
        when(owner.getRole()).thenReturn(Role.PATIENT);
        when(owner.getName()).thenReturn("Casey Patient");
        when(userRepository.findByEmail("patient@example.test")).thenReturn(Optional.of(owner));
        when(appointment.getBookedBy()).thenReturn(owner);
        when(appointment.getPatientProfile()).thenReturn(null);
        when(appointment.getAppointmentDate()).thenReturn(LocalDateTime.of(2030, 1, 2, 10, 30));
        when(appointment.getDoctor()).thenReturn(mock(Doctor.class));
        Doctor doctor = appointment.getDoctor();
        User doctorUser = mock(User.class);
        when(doctorUser.getName()).thenReturn("Dr. Example");
        when(doctor.getUser()).thenReturn(doctorUser);
        Specialization specialization = mock(Specialization.class);
        when(specialization.getName()).thenReturn("Cardiology");
        when(doctor.getSpecialization()).thenReturn(specialization);
        when(billingRecord.getId()).thenReturn(55L);
        when(billingRecord.getAmount()).thenReturn(new BigDecimal("750.00"));
        when(billingRecord.getStatus()).thenReturn(PaymentStatus.PENDING);
        when(billingRecord.getCreatedAt()).thenReturn(LocalDateTime.of(2029, 12, 1, 9, 0));

        String receipt = new String(
                billingService.getReceipt(12L, "patient@example.test"),
                java.nio.charset.StandardCharsets.UTF_8);
        assertTrue(receipt.contains("INR 750.00"));
        assertTrue(receipt.contains("Dr. Example"));

        User other = mock(User.class);
        when(other.getId()).thenReturn(99L);
        when(other.getRole()).thenReturn(Role.PATIENT);
        when(userRepository.findByEmail("other@example.test")).thenReturn(Optional.of(other));
        assertThrows(UnauthorizedAccessException.class,
                () -> billingService.getReceipt(12L, "other@example.test"));
    }
}
