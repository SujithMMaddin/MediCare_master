package com.medicare.service;

import com.medicare.dto.BillingResponse;
import com.medicare.entity.*;
import com.medicare.exception.InvalidAppointmentException;
import com.medicare.exception.UnauthorizedAccessException;
import com.medicare.repository.AppointmentRepository;
import com.medicare.repository.BillingRecordRepository;
import com.medicare.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class BillingService {

    private final BillingRecordRepository billingRepository;
    private final AppointmentRepository appointmentRepository;
    private final UserRepository userRepository;

    public BillingService(BillingRecordRepository billingRepository,
                          AppointmentRepository appointmentRepository,
                          UserRepository userRepository) {
        this.billingRepository = billingRepository;
        this.appointmentRepository = appointmentRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public BillingRecord createForAppointment(Appointment appointment, BigDecimal amount) {
        BillingRecord record = billingRepository.save(new BillingRecord(appointment, amount));
        appointment.setBillingRecord(record);
        return record;
    }

    @Transactional
    public void createMissingRecords() {
        for (Appointment appointment : appointmentRepository.findAll()) {
            if (billingRepository.findByAppointmentId(appointment.getId()).isPresent()) {
                continue;
            }
            BigDecimal amount = appointment.getConsultationFee();
            if (amount == null) {
                Doctor doctor = appointment.getDoctor();
                amount = doctor.getConsultationFee() == null
                        ? doctor.getSpecialization().getConsultationFee()
                        : doctor.getConsultationFee();
            }
            if (amount != null) {
                appointment.setConsultationFee(amount);
                createForAppointment(appointment, amount);
            }
        }
    }

    @Transactional(readOnly = true)
    public List<BillingResponse> getAll() {
        return billingRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toResponse).toList();
    }

    @Transactional
    public BillingResponse getForAppointment(Long appointmentId, String email) {
        BillingRecord record = findRecord(appointmentId);
        assertCanAccess(record.getAppointment(), email);
        return toResponse(record);
    }

    @Transactional
    public BillingResponse updateStatus(Long appointmentId, PaymentStatus status) {
        BillingRecord record = findRecord(appointmentId);
        if (record.getStatus() == PaymentStatus.PENDING && status == PaymentStatus.PAID) {
            record.setStatus(PaymentStatus.PAID);
            record.setPaidAt(LocalDateTime.now());
        } else if (record.getStatus() == PaymentStatus.PAID && status == PaymentStatus.REFUNDED) {
            record.setStatus(PaymentStatus.REFUNDED);
            record.setRefundedAt(LocalDateTime.now());
        } else {
            throw new InvalidAppointmentException(
                    "Payment can only move from Pending to Paid, or from Paid to Refunded");
        }
        return toResponse(billingRepository.save(record));
    }

    @Transactional
    public byte[] getReceipt(Long appointmentId, String email) {
        BillingRecord record = findRecord(appointmentId);
        Appointment appointment = record.getAppointment();
        assertCanAccess(appointment, email);
        String date = appointment.getAppointmentDate()
                .format(DateTimeFormatter.ofPattern("EEE, d MMM yyyy 'at' h:mm a"));
        String receipt = """
                MediCare - Consultation Receipt
                --------------------------------
                Receipt number: MC-%06d
                Appointment: #%d
                Patient: %s
                Doctor: %s
                Specialization: %s
                Appointment date: %s
                Consultation fee: INR %s
                Total amount: INR %s
                Payment status: %s
                Issued: %s
                """.formatted(record.getId(), appointment.getId(),
                appointment.getPatientProfile() == null
                        ? appointment.getBookedBy().getName()
                        : appointment.getPatientProfile().getFullName(),
                appointment.getDoctor().getUser().getName(),
                appointment.getDoctor().getSpecialization().getName(),
                date, record.getAmount().toPlainString(), record.getAmount().toPlainString(),
                record.getStatus(), record.getCreatedAt()
                        .format(DateTimeFormatter.ofPattern("d MMM yyyy, h:mm a")));
        return receipt.getBytes(StandardCharsets.UTF_8);
    }

    private BillingRecord findRecord(Long appointmentId) {
        return billingRepository.findByAppointmentId(appointmentId)
                .orElseThrow(() -> new InvalidAppointmentException(
                        "Billing record not found for appointment " + appointmentId));
    }

    private void assertCanAccess(Appointment appointment, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedAccessException("User not found"));
        boolean permitted = user.getRole() == Role.ADMIN
                || appointment.getBookedBy().getId().equals(user.getId())
                || (user.getRole() == Role.DOCTOR && user.getDoctor() != null
                && appointment.getDoctor().getId().equals(user.getDoctor().getId()));
        if (!permitted) {
            throw new UnauthorizedAccessException("You cannot access this billing record");
        }
    }

    private BillingResponse toResponse(BillingRecord record) {
        return new BillingResponse(record.getId(), record.getAppointment().getId(),
                record.getAmount(), "INR", record.getStatus(), record.getCreatedAt(),
                record.getPaidAt(), record.getRefundedAt());
    }
}
