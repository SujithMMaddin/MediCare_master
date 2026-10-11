package com.medicare.service;

import com.medicare.dto.NotificationResponse;
import com.medicare.entity.*;
import com.medicare.exception.UserNotFoundException;
import com.medicare.exception.UnauthorizedAccessException;
import com.medicare.repository.NotificationRepository;
import com.medicare.repository.AppointmentRepository;
import com.medicare.repository.UserRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class NotificationService {
    private final NotificationRepository notifications;
    private final UserRepository users;
    private final AppointmentRepository appointments;

    public NotificationService(NotificationRepository notifications, UserRepository users,
            AppointmentRepository appointments) {
        this.notifications = notifications; this.users = users; this.appointments = appointments;
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> mine(String email) {
        User user = user(email);
        return notifications.findTop100ByUserIdOrderByCreatedAtDesc(user.getId()).stream().map(this::response).toList();
    }

    @Transactional(readOnly = true)
    public long unreadCount(String email) { return notifications.countByUserIdAndReadAtIsNull(user(email).getId()); }

    @Transactional
    public NotificationResponse markRead(String email, Long id) {
        Notification item = notifications.findById(id).orElseThrow(() -> new IllegalArgumentException("Notification not found"));
        if (!item.getUser().getEmail().equalsIgnoreCase(email)) throw new UnauthorizedAccessException("You can only update your own notifications");
        if (item.getReadAt() == null) item.setReadAt(LocalDateTime.now());
        return response(notifications.save(item));
    }

    @Transactional
    public void notifyUser(User user, String type, String message, Long referenceId) {
        notifications.save(new Notification(user, type, message, referenceId));
    }

    @Transactional
    public void notifyUserOnce(User user, String type, String message, Long referenceId) {
        if (!notifications.existsByUserIdAndTypeAndReferenceId(user.getId(), type, referenceId)) {
            notifications.save(new Notification(user, type, message, referenceId));
        }
    }

    private void notifyOnce(User user, String type, String message, Long referenceId) {
        notifyUserOnce(user, type, message, referenceId);
    }

    @Transactional
    public void notifyAdmins(String type, String message, Long referenceId) {
        for (User admin : users.findByRole(Role.ADMIN)) notifyUserOnce(admin, type, message, referenceId);
    }

    @Transactional
    @Scheduled(cron = "0 0 9 * * *")
    public void sendNextDayReminders() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        for (Appointment appointment : appointments.findByAppointmentDateBetweenAndStatusIn(
                tomorrow.atStartOfDay(), tomorrow.plusDays(1).atStartOfDay().minusNanos(1),
                List.of(AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED))) {
            String reminderType = "APPOINTMENT_REMINDER_" + appointment.getAppointmentDate().toLocalDate();
            notifyOnce(appointment.getBookedBy(), reminderType,
                    "Reminder: your appointment with Dr. " + appointment.getDoctor().getUser().getName() + " is tomorrow.",
                    appointment.getId());
            notifyOnce(appointment.getDoctor().getUser(), reminderType,
                    "Reminder: you have an appointment tomorrow with " +
                            (appointment.getPatientProfile() == null ? appointment.getBookedBy().getName() : appointment.getPatientProfile().getFullName()) + ".",
                    appointment.getId());
        }
    }

    private User user(String email) {
        return users.findByEmail(email).orElseThrow(() -> new UserNotFoundException("User not found"));
    }
    private NotificationResponse response(Notification n) {
        return new NotificationResponse(n.getId(), n.getType(), n.getMessage(), n.getReferenceId(), n.getCreatedAt(), n.getReadAt());
    }
}
