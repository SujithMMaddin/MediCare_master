package com.medicare.repository;

import com.medicare.entity.PatientProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PatientProfileRepository extends JpaRepository<PatientProfile, Long> {
    List<PatientProfile> findByOwnerIdOrderBySelfDescFullNameAsc(Long ownerId);
    Optional<PatientProfile> findByOwnerIdAndSelfTrue(Long ownerId);
    Optional<PatientProfile> findByIdAndOwnerId(Long id, Long ownerId);
}
