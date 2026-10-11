package com.medicare.repository;

import com.medicare.entity.DoctorReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface DoctorReviewRepository extends JpaRepository<DoctorReview, Long> {
    Optional<DoctorReview> findByAppointmentId(Long appointmentId);
    List<DoctorReview> findAllByOrderByCreatedAtDesc();
    List<DoctorReview> findByPatientIdOrderByCreatedAtDesc(Long patientId);
    List<DoctorReview> findByDoctorIdAndApprovedTrueOrderByCreatedAtDesc(Long doctorId);
    boolean existsByAppointmentId(Long appointmentId);
    long countByApprovedFalse();
    @Query("select avg(r.rating) from DoctorReview r where r.doctor.id = :doctorId and r.approved = true")
    Double averageRating(@Param("doctorId") Long doctorId);
    @Query("select count(r) from DoctorReview r where r.doctor.id = :doctorId and r.approved = true")
    long countApprovedByDoctorId(Long doctorId);
}
