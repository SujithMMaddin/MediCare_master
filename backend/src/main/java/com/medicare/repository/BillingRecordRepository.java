package com.medicare.repository;

import com.medicare.entity.BillingRecord;
import com.medicare.entity.PaymentStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BillingRecordRepository extends JpaRepository<BillingRecord, Long> {

    @EntityGraph(attributePaths = {
            "appointment", "appointment.bookedBy", "appointment.doctor",
            "appointment.doctor.user", "appointment.doctor.specialization"
    })
    Optional<BillingRecord> findByAppointmentId(Long appointmentId);

    @EntityGraph(attributePaths = {
            "appointment", "appointment.bookedBy", "appointment.doctor",
            "appointment.doctor.user", "appointment.doctor.specialization"
    })
    List<BillingRecord> findAllByOrderByCreatedAtDesc();

    long countByStatus(PaymentStatus status);

    @Query("select coalesce(sum(b.amount), 0) from BillingRecord b where b.status = :status")
    java.math.BigDecimal sumByStatus(@Param("status") PaymentStatus status);
}
