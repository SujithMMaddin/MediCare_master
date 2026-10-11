package com.medicare.service;

import com.medicare.dto.DoctorLeaveDecision;
import com.medicare.dto.DoctorLeaveRequest;
import com.medicare.entity.*;
import com.medicare.repository.DoctorLeaveRepository;
import com.medicare.repository.DoctorRepository;
import com.medicare.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class DoctorLeaveServiceTest {
    @Test
    void newLeaveRequestRemainsPendingAndNotifiesAdmins() {
        User doctorUser = new User("Anita Example", "doctor@example.test", "encoded", Role.DOCTOR);
        doctorUser.setId(8L);
        Doctor doctor = new Doctor(doctorUser, new Specialization("Cardiology"));
        doctor.setId(12L);
        UserRepository users = mock(UserRepository.class);
        when(users.findByEmail(doctorUser.getEmail())).thenReturn(Optional.of(doctorUser));
        DoctorRepository doctors = mock(DoctorRepository.class);
        when(doctors.findByUserId(8L)).thenReturn(Optional.of(doctor));
        when(doctors.findByIdForUpdate(12L)).thenReturn(Optional.of(doctor));
        DoctorLeaveRepository leaves = mock(DoctorLeaveRepository.class);
        when(leaves.save(any(DoctorLeave.class))).thenAnswer(call -> call.getArgument(0));
        ScheduleConflictService conflicts = mock(ScheduleConflictService.class);
        NotificationService notifications = mock(NotificationService.class);

        DoctorLeaveService service = new DoctorLeaveService(users, doctors, leaves, conflicts, notifications);
        var response = service.create(doctorUser.getEmail(), new DoctorLeaveRequest(
                LocalDate.now().plusDays(2), LocalDate.now().plusDays(3), "Conference"));

        assertEquals(DoctorLeaveStatus.PENDING, response.status());
        verify(notifications).notifyAdmins(eq("DOCTOR_LEAVE_REQUEST"), contains("submitted a leave request"), isNull());
        verify(notifications, never()).notifyUserOnce(any(), anyString(), anyString(), any());
        verifyNoInteractions(conflicts);
    }

    @Test
    void approvalMakesLeaveActiveRefreshesConflictsAndNotifiesDoctor() {
        User doctorUser = new User("Anita Example", "doctor@example.test", "encoded", Role.DOCTOR);
        Doctor doctor = new Doctor(doctorUser, new Specialization("Cardiology"));
        doctor.setId(12L);
        DoctorLeave leave = new DoctorLeave(doctor, LocalDate.now().plusDays(2),
                LocalDate.now().plusDays(3), "Personal");
        ReflectionTestUtils.setField(leave, "id", 41L);

        DoctorLeaveRepository leaves = mock(DoctorLeaveRepository.class);
        when(leaves.findById(41L)).thenReturn(Optional.of(leave));
        when(leaves.save(any(DoctorLeave.class))).thenAnswer(call -> call.getArgument(0));
        DoctorRepository doctors = mock(DoctorRepository.class);
        when(doctors.findByIdForUpdate(12L)).thenReturn(Optional.of(doctor));
        ScheduleConflictService conflicts = mock(ScheduleConflictService.class);
        NotificationService notifications = mock(NotificationService.class);

        DoctorLeaveService service = new DoctorLeaveService(
                mock(UserRepository.class), doctors, leaves, conflicts, notifications);
        var response = service.decide(41L, new DoctorLeaveDecision(DoctorLeaveStatus.APPROVED, null));

        assertEquals(DoctorLeaveStatus.APPROVED, response.status());
        verify(conflicts).refresh(doctor);
        String dates = LocalDate.now().plusDays(2).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                + " to " + LocalDate.now().plusDays(3).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        verify(notifications).notifyUserOnce(eq(doctorUser), eq("LEAVE_REQUEST_APPROVED"),
                contains(dates), eq(41L));
    }

    @Test
    void rejectionDoesNotChangeBookingAvailability() {
        User doctorUser = new User("Anita Example", "doctor@example.test", "encoded", Role.DOCTOR);
        Doctor doctor = new Doctor(doctorUser, new Specialization("Cardiology"));
        doctor.setId(12L);
        DoctorLeave leave = new DoctorLeave(doctor, LocalDate.now().plusDays(2),
                LocalDate.now().plusDays(3), "Personal");
        ReflectionTestUtils.setField(leave, "id", 41L);

        DoctorLeaveRepository leaves = mock(DoctorLeaveRepository.class);
        when(leaves.findById(41L)).thenReturn(Optional.of(leave));
        when(leaves.save(any(DoctorLeave.class))).thenAnswer(call -> call.getArgument(0));
        DoctorRepository doctors = mock(DoctorRepository.class);
        when(doctors.findByIdForUpdate(12L)).thenReturn(Optional.of(doctor));
        ScheduleConflictService conflicts = mock(ScheduleConflictService.class);
        NotificationService notifications = mock(NotificationService.class);

        DoctorLeaveService service = new DoctorLeaveService(
                mock(UserRepository.class), doctors, leaves, conflicts, notifications);
        var response = service.decide(41L, new DoctorLeaveDecision(DoctorLeaveStatus.REJECTED, "Insufficient notice"));

        assertEquals(DoctorLeaveStatus.REJECTED, response.status());
        verifyNoInteractions(conflicts);
        String dates = LocalDate.now().plusDays(2).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                + " to " + LocalDate.now().plusDays(3).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        verify(notifications).notifyUserOnce(eq(doctorUser), eq("LEAVE_REQUEST_REJECTED"),
                argThat(message -> message.contains(dates) && message.contains("Reason: Insufficient notice")), eq(41L));
    }

    @Test
    void adminRemovalOfApprovedLeaveRefreshesConflictsAndNotifiesDoctor() {
        User doctorUser = new User("Anita Example", "doctor@example.test", "encoded", Role.DOCTOR);
        Doctor doctor = new Doctor(doctorUser, new Specialization("Cardiology"));
        doctor.setId(12L);
        DoctorLeave leave = new DoctorLeave(doctor, LocalDate.now().plusDays(2),
                LocalDate.now().plusDays(3), "Personal");
        leave.setStatus(DoctorLeaveStatus.APPROVED);
        ReflectionTestUtils.setField(leave, "id", 41L);

        DoctorLeaveRepository leaves = mock(DoctorLeaveRepository.class);
        when(leaves.findById(41L)).thenReturn(Optional.of(leave));
        DoctorRepository doctors = mock(DoctorRepository.class);
        when(doctors.findByIdForUpdate(12L)).thenReturn(Optional.of(doctor));
        ScheduleConflictService conflicts = mock(ScheduleConflictService.class);
        NotificationService notifications = mock(NotificationService.class);

        DoctorLeaveService service = new DoctorLeaveService(
                mock(UserRepository.class), doctors, leaves, conflicts, notifications);
        service.removeAsAdmin(41L);

        verify(leaves).delete(leave);
        verify(leaves).flush();
        verify(conflicts).refresh(doctor);
        String dates = LocalDate.now().plusDays(2).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                + " to " + LocalDate.now().plusDays(3).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        verify(notifications).notifyUserOnce(eq(doctorUser), eq("LEAVE_REQUEST_CANCELLED"),
                argThat(message -> message.contains(dates) && message.contains("cancelled by an administrator")),
                eq(41L));
    }
}
