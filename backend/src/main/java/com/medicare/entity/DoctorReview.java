package com.medicare.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import java.time.LocalDateTime;

@Entity
@Table(name = "doctor_reviews")
public class DoctorReview {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "appointment_id", nullable = false, unique = true)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Appointment appointment;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private User patient;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "doctor_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Doctor doctor;
    @Column(nullable = false)
    private int rating;
    @Column(length = 2000)
    private String comment;
    @Column(nullable = false)
    private boolean approved;
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    public DoctorReview() {}
    public DoctorReview(Appointment appointment, User patient, Doctor doctor, int rating, String comment) {
        this.appointment = appointment; this.patient = patient; this.doctor = doctor; this.rating = rating; this.comment = comment;
    }
    @PrePersist protected void onCreate() { createdAt = LocalDateTime.now(); }
    public Long getId() { return id; }
    public Appointment getAppointment() { return appointment; }
    public User getPatient() { return patient; }
    public Doctor getDoctor() { return doctor; }
    public int getRating() { return rating; }
    public String getComment() { return comment; }
    public boolean isApproved() { return approved; }
    public void setApproved(boolean approved) { this.approved = approved; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
