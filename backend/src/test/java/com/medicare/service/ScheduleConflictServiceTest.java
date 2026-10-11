package com.medicare.service;

import com.medicare.entity.*;
import com.medicare.repository.AppointmentRepository;
import com.medicare.repository.DoctorLeaveRepository;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ScheduleConflictServiceTest {
    @Test
    void scheduleChangesFlagBookedAppointmentsAndNotifyBothPartiesWithoutChangingThem() {
        User doctorUser = new User("Anita Example", "doctor@example.test", "encoded", Role.DOCTOR);
        User patient = new User("Pat Example", "patient@example.test", "encoded", Role.PATIENT);
        Doctor doctor = new Doctor(doctorUser, new Specialization("Cardiology"));
        doctor.setId(12L);
        doctor.getAvailabilities().add(new Availability(doctor, DayOfWeek.TUESDAY,
                LocalTime.of(9, 0), LocalTime.of(12, 0), 30));

        var appointmentDate = LocalDate.now().with(java.time.temporal.TemporalAdjusters.next(DayOfWeek.MONDAY))
                .atTime(10, 0);
        Appointment appointment = mock(Appointment.class);
        when(appointment.getId()).thenReturn(41L);
        when(appointment.getAppointmentDate()).thenReturn(appointmentDate);
        when(appointment.getStatus()).thenReturn(AppointmentStatus.CONFIRMED);
        when(appointment.isScheduleConflict()).thenReturn(false, true);
        when(appointment.getBookedBy()).thenReturn(patient);
        when(appointment.getPatientProfile()).thenReturn(null);

        AppointmentRepository appointments = mock(AppointmentRepository.class);
        when(appointments.findByDoctorIdAndAppointmentDateAfterAndStatusIn(
                eq(doctor.getId()), any(), anyList())).thenReturn(List.of(appointment));
        DoctorLeaveRepository leaves = mock(DoctorLeaveRepository.class);
        when(leaves.findByDoctorIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                doctor.getId(), DoctorLeaveStatus.APPROVED,
                appointmentDate.toLocalDate(), appointmentDate.toLocalDate())).thenReturn(List.of());
        NotificationService notifications = mock(NotificationService.class);

        ScheduleConflictService service = new ScheduleConflictService(appointments, leaves, notifications);
        service.refresh(doctor);
        service.refresh(doctor);

        verify(appointment).setScheduleConflict(true);
        verify(appointment, never()).setAppointmentDate(any());
        verify(appointment, never()).setStatus(any());
        verify(notifications).notifyUser(eq(patient), eq("SCHEDULE_CONFLICT"),
                contains("Please use Reschedule to select a currently available time."), eq(41L));
        verify(notifications).notifyUser(eq(doctorUser), eq("SCHEDULE_CONFLICT"), contains("remains unchanged"), eq(41L));
        verifyNoMoreInteractions(notifications);
    }
}
