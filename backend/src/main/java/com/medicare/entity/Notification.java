package com.medicare.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications", indexes = @Index(name = "idx_notification_user_created", columnList = "user_id,created_at"))
public class Notification {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private User user;
    @Column(nullable = false, length = 40)
    private String type;
    @Column(nullable = false, length = 500)
    private String message;
    @Column(name = "reference_id")
    private Long referenceId;
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    @Column(name = "read_at")
    private LocalDateTime readAt;
    public Notification() {}
    public Notification(User user, String type, String message, Long referenceId) {
        this.user = user; this.type = type; this.message = message; this.referenceId = referenceId;
    }
    @PrePersist protected void onCreate() { createdAt = LocalDateTime.now(); }
    public Long getId() { return id; }
    public User getUser() { return user; }
    public String getType() { return type; }
    public String getMessage() { return message; }
    public Long getReferenceId() { return referenceId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getReadAt() { return readAt; }
    public void setReadAt(LocalDateTime readAt) { this.readAt = readAt; }
}
