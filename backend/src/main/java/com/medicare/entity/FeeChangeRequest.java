package com.medicare.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "fee_change_requests")
public class FeeChangeRequest {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "doctor_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Doctor doctor;
    @Column(name = "proposed_fee", nullable = false, precision = 10, scale = 2)
    private BigDecimal proposedFee;
    @Column(nullable = false, length = 1000)
    private String reason;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private FeeRequestStatus status = FeeRequestStatus.PENDING;
    @Column(name = "admin_comment", length = 1000)
    private String adminComment;
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    @Column(name = "decided_at")
    private LocalDateTime decidedAt;
    public FeeChangeRequest() {}
    public FeeChangeRequest(Doctor doctor, BigDecimal proposedFee, String reason) {
        this.doctor = doctor; this.proposedFee = proposedFee; this.reason = reason;
    }
    @PrePersist protected void onCreate() { createdAt = LocalDateTime.now(); }
    public Long getId() { return id; }
    public Doctor getDoctor() { return doctor; }
    public BigDecimal getProposedFee() { return proposedFee; }
    public String getReason() { return reason; }
    public FeeRequestStatus getStatus() { return status; }
    public void setStatus(FeeRequestStatus status) { this.status = status; }
    public String getAdminComment() { return adminComment; }
    public void setAdminComment(String adminComment) { this.adminComment = adminComment; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getDecidedAt() { return decidedAt; }
    public void setDecidedAt(LocalDateTime decidedAt) { this.decidedAt = decidedAt; }
}
