package com.medicare.service;

import com.medicare.entity.*;
import com.medicare.repository.*;
import org.junit.jupiter.api.Test;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AvailabilitySearchTest {
    @Test void approvedLeaveExcludesOnlyInclusiveLeaveDatesAndOccupiedSlots() {
        var appointments=mock(AppointmentRepository.class);var users=mock(UserRepository.class);var doctors=mock(DoctorRepository.class);
        var profiles=mock(PatientProfileRepository.class);var limiter=mock(BookingRateLimiter.class);var billing=mock(BillingService.class);
        var leaves=mock(DoctorLeaveRepository.class);var notifications=mock(NotificationService.class);
        var account=new User("Doctor","doctor@example.test","hash",Role.DOCTOR);var doctor=new Doctor(account,null);doctor.setId(4L);
        doctor.getAvailabilities().add(new Availability(doctor,DayOfWeek.MONDAY,LocalTime.of(9,0),LocalTime.of(10,0),30));
        when(doctors.findById(4L)).thenReturn(Optional.of(doctor));
        when(appointments.findOccupiedAppointmentDates(eq(4L),any(),any(),anyList())).thenReturn(List.of(LocalDateTime.of(2026,10,19,9,0)));
        var leave=new DoctorLeave(doctor,LocalDate.of(2026,10,11),LocalDate.of(2026,10,13),"leave");leave.setStatus(DoctorLeaveStatus.APPROVED);
        when(leaves.findByDoctorIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqual(4L,DoctorLeaveStatus.APPROVED,LocalDate.of(2026,10,25),LocalDate.of(2026,10,11))).thenReturn(List.of(leave));
        var service=new AppointmentService(appointments,users,doctors,profiles,limiter,billing,leaves,notifications,3);
        var result=service.getAvailabilitySearch(4L,LocalDate.of(2026,10,11),LocalDate.of(2026,10,25));
        assertEquals("AVAILABLE",result.reason());
        assertEquals(List.of(new com.medicare.dto.AvailableSlotResponse(LocalDate.of(2026,10,19),LocalTime.of(9,30))),result.slots());
    }

    @Test void doctorWithoutWeeklyScheduleHasExplicitAvailabilityReason(){
        var appointments=mock(AppointmentRepository.class);var doctors=mock(DoctorRepository.class);var leaves=mock(DoctorLeaveRepository.class);
        var doctor=new Doctor(new User("Doctor","doctor@example.test","hash",Role.DOCTOR),null);doctor.setId(8L);when(doctors.findById(8L)).thenReturn(Optional.of(doctor));
        when(appointments.findOccupiedAppointmentDates(eq(8L),any(),any(),anyList())).thenReturn(List.of());
        var service=new AppointmentService(appointments,mock(UserRepository.class),doctors,mock(PatientProfileRepository.class),mock(BookingRateLimiter.class),mock(BillingService.class),leaves,mock(NotificationService.class),3);
        var result=service.getAvailabilitySearch(8L,LocalDate.of(2026,10,11),LocalDate.of(2026,10,20));
        assertEquals("NO_SCHEDULE",result.reason());assertTrue(result.slots().isEmpty());
    }
}
