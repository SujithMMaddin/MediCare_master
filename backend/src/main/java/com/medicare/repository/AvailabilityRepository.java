package com.medicare.repository;

import com.medicare.entity.Availability;
import com.medicare.entity.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.DayOfWeek;
import java.util.List;

public interface AvailabilityRepository extends JpaRepository<Availability, Long> {

    List<Availability> findByDoctorOrderByDayOfWeekAscStartTimeAsc(Doctor doctor);

    List<Availability> findByDoctorAndDayOfWeek(
            Doctor doctor,
            DayOfWeek dayOfWeek
    );
}