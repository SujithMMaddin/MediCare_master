package com.medicare.service;

import com.medicare.entity.Role;
import com.medicare.entity.User;
import com.medicare.repository.AppointmentRepository;
import com.medicare.repository.NotificationRepository;
import com.medicare.repository.UserRepository;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class NotificationServiceTest {
    @Test
    void notifyUserOnceDoesNotCreateDuplicateForSameAction() {
        User user = new User("Doctor Example", "doctor@example.test", "encoded", Role.DOCTOR);
        user.setId(22L);
        NotificationRepository notifications = mock(NotificationRepository.class);
        when(notifications.existsByUserIdAndTypeAndReferenceId(22L, "LEAVE_REQUEST_APPROVED", 41L))
                .thenReturn(false, true);
        NotificationService service = new NotificationService(
                notifications, mock(UserRepository.class), mock(AppointmentRepository.class));

        service.notifyUserOnce(user, "LEAVE_REQUEST_APPROVED", "Leave approved", 41L);
        service.notifyUserOnce(user, "LEAVE_REQUEST_APPROVED", "Leave approved", 41L);

        verify(notifications, times(2)).existsByUserIdAndTypeAndReferenceId(
                22L, "LEAVE_REQUEST_APPROVED", 41L);
        verify(notifications, times(1)).save(any());
    }

    @Test
    void notifyAdminsDoesNotDuplicateTheSameRequestAlert() {
        User admin = new User("Admin Example", "admin@example.test", "encoded", Role.ADMIN);
        admin.setId(1L);
        UserRepository users = mock(UserRepository.class);
        when(users.findByRole(Role.ADMIN)).thenReturn(List.of(admin));
        NotificationRepository notifications = mock(NotificationRepository.class);
        when(notifications.existsByUserIdAndTypeAndReferenceId(1L, "DOCTOR_LEAVE_REQUEST", 41L))
                .thenReturn(false, true);
        NotificationService service = new NotificationService(
                notifications, users, mock(AppointmentRepository.class));

        service.notifyAdmins("DOCTOR_LEAVE_REQUEST", "Leave submitted", 41L);
        service.notifyAdmins("DOCTOR_LEAVE_REQUEST", "Leave submitted", 41L);

        verify(notifications, times(2)).existsByUserIdAndTypeAndReferenceId(
                1L, "DOCTOR_LEAVE_REQUEST", 41L);
        verify(notifications, times(1)).save(any());
    }
}
