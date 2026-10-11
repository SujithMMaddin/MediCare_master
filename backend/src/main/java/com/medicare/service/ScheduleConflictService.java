package com.medicare.service;

import com.medicare.entity.Appointment;
import com.medicare.entity.AppointmentStatus;
import com.medicare.entity.Availability;
import com.medicare.entity.Doctor;
import com.medicare.entity.DoctorLeaveStatus;
import com.medicare.repository.AppointmentRepository;
import com.medicare.repository.DoctorLeaveRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
public class ScheduleConflictService {
    private final AppointmentRepository appointments;
    private final DoctorLeaveRepository leaves;
    private final NotificationService notifications;

    public ScheduleConflictService(AppointmentRepository appointments, DoctorLeaveRepository leaves,
            NotificationService notifications) {
        this.appointments = appointments;
        this.leaves = leaves;
        this.notifications = notifications;
    }

    @Transactional
    public void refresh(Doctor doctor) {
        List<AppointmentStatus> activeStatuses = List.of(AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED);
        for (Appointment appointment : appointments.findByDoctorIdAndAppointmentDateAfterAndStatusIn(
                doctor.getId(), LocalDateTime.now(), activeStatuses)) {
            boolean conflict = !matchesAvailability(doctor, appointment.getAppointmentDate())
                    || isOnLeave(doctor, appointment.getAppointmentDate());
            if (appointment.isScheduleConflict() == conflict) continue;
            appointment.setScheduleConflict(conflict);
            if (!conflict) continue;

            String date = appointment.getAppointmentDate().toString().replace('T', ' ');
            String patientMessage = "Your appointment with Dr. " + doctor.getUser().getName() + " at "
                    + date + " remains booked, but conflicts with the doctor's updated availability. "
                    + "Please use Reschedule to select a currently available time.";
            String patientName = appointment.getPatientProfile() == null
                    ? appointment.getBookedBy().getName()
                    : appointment.getPatientProfile().getFullName();
            String doctorMessage = "Your appointment with " + patientName + " at " + date
                    + " remains unchanged but conflicts with the updated availability.";
            notifications.notifyUser(appointment.getBookedBy(), "SCHEDULE_CONFLICT",
                    patientMessage, appointment.getId());
            notifications.notifyUser(doctor.getUser(), "SCHEDULE_CONFLICT",
                    doctorMessage, appointment.getId());
        }
    }

    private boolean isOnLeave(Doctor doctor, LocalDateTime appointmentDate) {
        var date = appointmentDate.toLocalDate();
        return !leaves.findByDoctorIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                doctor.getId(), DoctorLeaveStatus.APPROVED, date, date).isEmpty();
    }

    private boolean matchesAvailability(Doctor doctor, LocalDateTime appointmentDate) {
        if (appointmentDate.getSecond() != 0 || appointmentDate.getNano() != 0) return false;
        DayOfWeek dayOfWeek = appointmentDate.getDayOfWeek();
        LocalTime appointmentTime = appointmentDate.toLocalTime();
        return doctor.getAvailabilities().stream().anyMatch(availability ->
                availability.isActive()
                        && availability.getDayOfWeek() == dayOfWeek
                        && !appointmentTime.isBefore(availability.getStartTime())
                        && appointmentTime.plusMinutes(availability.getSlotDurationMinutes())
                                .compareTo(availability.getEndTime()) <= 0
                        && isValidSlot(appointmentTime, availability));
    }

    private boolean isValidSlot(LocalTime appointmentTime, Availability availability) {
        long minutes = Duration.between(availability.getStartTime(), appointmentTime).toMinutes();
        return minutes >= 0 && minutes % availability.getSlotDurationMinutes() == 0;
    }
}
