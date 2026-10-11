package com.medicare.repository;

import com.medicare.entity.DoctorLeave;
import com.medicare.entity.DoctorLeaveStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface DoctorLeaveRepository extends JpaRepository<DoctorLeave, Long> {
    List<DoctorLeave> findByDoctorIdAndEndDateGreaterThanEqualOrderByStartDateAsc(Long doctorId, LocalDate from);
    List<DoctorLeave> findByDoctorIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            Long doctorId, DoctorLeaveStatus status, LocalDate end, LocalDate start);
    boolean existsByDoctorIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            Long doctorId, DoctorLeaveStatus status, LocalDate date, LocalDate sameDate);
    List<DoctorLeave> findByDoctorIdOrderByCreatedAtDesc(Long doctorId);
    List<DoctorLeave> findAllByOrderByCreatedAtDesc();
}
