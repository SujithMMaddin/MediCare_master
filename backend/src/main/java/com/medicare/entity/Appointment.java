

package com.medicare.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "appointments")
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "appointment_date", nullable = false)
    private LocalDateTime appointmentDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AppointmentStatus status;

    @Column(length = 500)
    private String reason;

    @Column(name = "schedule_conflict", nullable = false, columnDefinition = "boolean default false")
    private boolean scheduleConflict;

    @Column(name = "consultation_fee", precision = 10, scale = 2)
    private BigDecimal consultationFee;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User bookedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_profile_id")
    private PatientProfile patientProfile;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @OneToOne(mappedBy = "appointment", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private BillingRecord billingRecord;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public Appointment() {
    }

    public Appointment(
            LocalDateTime appointmentDate,
            AppointmentStatus status,
            String reason,
            User bookedBy,
            PatientProfile patientProfile,
            Doctor doctor) {

        this.appointmentDate = appointmentDate;
        this.status = status;
        this.reason = reason;
        this.bookedBy = bookedBy;
        this.patientProfile = patientProfile;
        this.doctor = doctor;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public LocalDateTime getAppointmentDate() {
        return appointmentDate;
    }

    public void setAppointmentDate(LocalDateTime appointmentDate) {
        this.appointmentDate = appointmentDate;
    }

    public AppointmentStatus getStatus() {
        return status;
    }

    public void setStatus(AppointmentStatus status) {
        this.status = status;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public boolean isScheduleConflict() { return scheduleConflict; }
    public void setScheduleConflict(boolean scheduleConflict) { this.scheduleConflict = scheduleConflict; }

    public BigDecimal getConsultationFee() {
        return consultationFee;
    }

    public void setConsultationFee(BigDecimal consultationFee) {
        this.consultationFee = consultationFee;
    }

    public User getBookedBy() {
        return bookedBy;
    }

    public PatientProfile getPatientProfile() { return patientProfile; }

    public void setPatientProfile(PatientProfile patientProfile) { this.patientProfile = patientProfile; }

    public void setBookedBy(User bookedBy) {
        this.bookedBy = bookedBy;
    }

    public Doctor getDoctor() {
        return doctor;
    }

    public void setDoctor(Doctor doctor) {
        this.doctor = doctor;
    }

    public BillingRecord getBillingRecord() {
        return billingRecord;
    }

    public void setBillingRecord(BillingRecord billingRecord) {
        this.billingRecord = billingRecord;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
