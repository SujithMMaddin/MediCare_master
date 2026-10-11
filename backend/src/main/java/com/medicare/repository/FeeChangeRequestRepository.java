package com.medicare.repository;

import com.medicare.entity.FeeChangeRequest;
import com.medicare.entity.FeeRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FeeChangeRequestRepository extends JpaRepository<FeeChangeRequest, Long> {
    List<FeeChangeRequest> findAllByOrderByCreatedAtDesc();
    List<FeeChangeRequest> findByDoctorIdOrderByCreatedAtDesc(Long doctorId);
    boolean existsByDoctorIdAndStatus(Long doctorId, FeeRequestStatus status);
    long countByStatus(FeeRequestStatus status);
}
