package com.medicare.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "doctor_leaves", indexes = @Index(name = "idx_doctor_leave_dates", columnList = "doctor_id,start_date,end_date"))
public class DoctorLeave {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "doctor_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Doctor doctor;
    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;
    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;
    @Column(length = 500)
    private String reason;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20, columnDefinition = "varchar(20) not null default 'APPROVED'")
    private DoctorLeaveStatus status = DoctorLeaveStatus.PENDING;
    @Column(name = "admin_comment", length = 500)
    private String adminComment;
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    @Column(name = "decided_at")
    private LocalDateTime decidedAt;

    public DoctorLeave() {}
    public DoctorLeave(Doctor doctor, LocalDate startDate, LocalDate endDate, String reason) {
        this.doctor = doctor; this.startDate = startDate; this.endDate = endDate; this.reason = reason;
    }
    @PrePersist protected void onCreate() { createdAt = LocalDateTime.now(); }
    public Long getId() { return id; }
    public Doctor getDoctor() { return doctor; }
    public LocalDate getStartDate() { return startDate; }
    public LocalDate getEndDate() { return endDate; }
    public String getReason() { return reason; }
    public DoctorLeaveStatus getStatus() { return status; }
    public void setStatus(DoctorLeaveStatus status) { this.status = status; }
    public String getAdminComment() { return adminComment; }
    public void setAdminComment(String adminComment) { this.adminComment = adminComment; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getDecidedAt() { return decidedAt; }
    public void setDecidedAt(LocalDateTime decidedAt) { this.decidedAt = decidedAt; }
}
