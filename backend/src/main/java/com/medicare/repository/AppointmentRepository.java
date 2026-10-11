package com.medicare.repository;

import com.medicare.entity.Appointment;
import com.medicare.entity.AppointmentStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;

import java.time.LocalDateTime;
import java.util.List;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from Appointment a where a.id = :id")
    java.util.Optional<Appointment> findByIdForUpdate(@Param("id") Long id);

    @Modifying
    @Query(value = "update appointments set patient_profile_id = :profileId where user_id = :accountId and patient_profile_id is null", nativeQuery = true)
    int assignLegacyAppointmentsToSelf(@Param("accountId") Long accountId, @Param("profileId") Long profileId);

    @EntityGraph(attributePaths = {"bookedBy", "patientProfile", "doctor", "doctor.user", "doctor.specialization"})
    List<Appointment> findByBookedByIdOrderByAppointmentDateDesc(Long bookedById);

    @EntityGraph(attributePaths = {"bookedBy", "patientProfile", "doctor", "doctor.user", "doctor.specialization"})
    List<Appointment> findByDoctorIdOrderByAppointmentDateDesc(Long doctorId);

    @EntityGraph(attributePaths = {"bookedBy", "patientProfile", "doctor", "doctor.user", "doctor.specialization"})
    List<Appointment> findAllByOrderByAppointmentDateDesc();

    long countByBookedByIdAndStatusInAndAppointmentDateAfter(Long accountId, List<AppointmentStatus> statuses, LocalDateTime after);

    @EntityGraph(attributePaths = {"doctor", "doctor.availabilities"})
    List<Appointment> findByPatientProfileIdAndStatusInAndAppointmentDateAfter(Long profileId, List<AppointmentStatus> statuses, LocalDateTime after);

    @Query("select a.appointmentDate from Appointment a where a.doctor.id = :doctorId and a.appointmentDate >= :from and a.appointmentDate < :to and a.status in :statuses")
    List<LocalDateTime> findOccupiedAppointmentDates(@Param("doctorId") Long doctorId,
            @Param("from") LocalDateTime from, @Param("to") LocalDateTime to,
            @Param("statuses") List<AppointmentStatus> statuses);

    boolean existsByDoctorIdAndAppointmentDateAndStatusIn(
            Long doctorId,
            LocalDateTime appointmentDate,
            List<AppointmentStatus> statuses
    );

    @EntityGraph(attributePaths = {"bookedBy", "doctor", "doctor.user"})
    List<Appointment> findByDoctorIdAndAppointmentDateBetweenAndStatusIn(Long doctorId, LocalDateTime from, LocalDateTime to, List<AppointmentStatus> statuses);

    @EntityGraph(attributePaths = {"bookedBy", "patientProfile", "doctor", "doctor.user", "doctor.availabilities"})
    List<Appointment> findByDoctorIdAndAppointmentDateAfterAndStatusIn(Long doctorId, LocalDateTime after, List<AppointmentStatus> statuses);

    @EntityGraph(attributePaths = {"bookedBy", "doctor", "doctor.user"})
    List<Appointment> findByAppointmentDateBetweenAndStatusIn(LocalDateTime from, LocalDateTime to, List<AppointmentStatus> statuses);

    @Query("select count(a) from Appointment a where a.status in :statuses and a.appointmentDate > :now")
    long countUpcoming(@Param("statuses") List<AppointmentStatus> statuses, @Param("now") LocalDateTime now);

    @Query("select count(a) from Appointment a where a.bookedBy.id = :accountId and a.status in :statuses and a.appointmentDate > :now and a.id <> :excludedId")
    long countOtherActiveByAccount(@Param("accountId") Long accountId, @Param("statuses") List<AppointmentStatus> statuses,
            @Param("now") LocalDateTime now, @Param("excludedId") Long excludedId);

    @Query("select a from Appointment a where a.doctor.id = :doctorId and a.appointmentDate = :date and a.status in :statuses and a.id <> :excludedId")
    List<Appointment> findOtherActiveAtDoctorSlot(@Param("doctorId") Long doctorId, @Param("date") LocalDateTime date,
            @Param("statuses") List<AppointmentStatus> statuses, @Param("excludedId") Long excludedId);

    @EntityGraph(attributePaths = {"doctor", "doctor.availabilities"})
    @Query("select a from Appointment a where a.patientProfile.id = :profileId and a.status in :statuses and a.appointmentDate > :now and a.id <> :excludedId")
    List<Appointment> findOtherActiveByPatientProfile(@Param("profileId") Long profileId, @Param("statuses") List<AppointmentStatus> statuses,
            @Param("now") LocalDateTime now, @Param("excludedId") Long excludedId);
}
