package com.medicare.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "patient_profiles", uniqueConstraints = {
        @UniqueConstraint(name = "uk_patient_profile_account_key", columnNames = {"owner_id", "profile_key"})
})
public class PatientProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(name = "full_name", nullable = false, length = 120)
    private String fullName;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PatientRelationship relationship;

    @Column(name = "is_self", nullable = false)
    private boolean self;

    @Column(name = "profile_key", nullable = false, length = 40)
    private String profileKey;

    protected PatientProfile() {}

    public PatientProfile(User owner, String fullName, LocalDate dateOfBirth,
                          PatientRelationship relationship, boolean self, String profileKey) {
        this.owner = owner;
        this.fullName = fullName;
        this.dateOfBirth = dateOfBirth;
        this.relationship = relationship;
        this.self = self;
        this.profileKey = profileKey;
    }

    public Long getId() { return id; }
    public User getOwner() { return owner; }
    public String getFullName() { return fullName; }
    public LocalDate getDateOfBirth() { return dateOfBirth; }
    public PatientRelationship getRelationship() { return relationship; }
    public boolean isSelf() { return self; }
    public String getProfileKey() { return profileKey; }
}
