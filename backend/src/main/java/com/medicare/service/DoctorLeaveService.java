package com.medicare.service;

import com.medicare.dto.DoctorLeaveRequest;
import com.medicare.dto.DoctorLeaveResponse;
import com.medicare.dto.DoctorLeaveDecision;
import com.medicare.entity.*;
import com.medicare.exception.UserNotFoundException;
import com.medicare.exception.UnauthorizedAccessException;
import com.medicare.repository.DoctorLeaveRepository;
import com.medicare.repository.DoctorRepository;
import com.medicare.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class DoctorLeaveService {
    private static final DateTimeFormatter LEAVE_DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final UserRepository users;
    private final DoctorRepository doctors;
    private final DoctorLeaveRepository leaves;
    private final ScheduleConflictService scheduleConflicts;
    private final NotificationService notifications;
    public DoctorLeaveService(UserRepository users, DoctorRepository doctors, DoctorLeaveRepository leaves,
            ScheduleConflictService scheduleConflicts, NotificationService notifications) {
        this.users = users; this.doctors = doctors; this.leaves = leaves;
        this.scheduleConflicts = scheduleConflicts; this.notifications = notifications;
    }
    @Transactional(readOnly = true)
    public List<DoctorLeaveResponse> mine(String email) {
        Doctor d = doctor(email);
        return leaves.findByDoctorIdOrderByCreatedAtDesc(d.getId())
                .stream().map(this::response).toList();
    }

    @Transactional(readOnly = true)
    public List<DoctorLeaveResponse> all() {
        return leaves.findAllByOrderByCreatedAtDesc().stream().map(this::response).toList();
    }

    @Transactional
    public DoctorLeaveResponse create(String email, DoctorLeaveRequest request) {
        Doctor d = doctor(email);
        d = doctors.findByIdForUpdate(d.getId())
                .orElseThrow(() -> new IllegalArgumentException("Doctor profile not found"));
        if (request.startDate().isBefore(LocalDate.now()) || request.endDate().isBefore(request.startDate()))
            throw new IllegalArgumentException("Leave must start today or later and end on or after its start date");
        String reason = request.reason() == null || request.reason().isBlank() ? null : request.reason().trim();
        DoctorLeave saved = leaves.save(new DoctorLeave(d, request.startDate(), request.endDate(), reason));
        notifications.notifyAdmins("DOCTOR_LEAVE_REQUEST",
                "Dr. " + d.getUser().getName() + " submitted a leave request for "
                        + request.startDate() + " to " + request.endDate() + ".", saved.getId());
        return response(saved);
    }

    @Transactional
    public DoctorLeaveResponse decide(Long id, DoctorLeaveDecision decision) {
        DoctorLeave leave = leaves.findById(id).orElseThrow(() -> new IllegalArgumentException("Leave request not found"));
        if (leave.getStatus() != DoctorLeaveStatus.PENDING)
            throw new IllegalArgumentException("This leave request has already been decided");
        if (decision.status() != DoctorLeaveStatus.APPROVED && decision.status() != DoctorLeaveStatus.REJECTED)
            throw new IllegalArgumentException("Decision must be APPROVED or REJECTED");

        Doctor doctor = doctors.findByIdForUpdate(leave.getDoctor().getId())
                .orElseThrow(() -> new IllegalArgumentException("Doctor profile not found"));
        leave = leaves.findById(id).orElseThrow(() -> new IllegalArgumentException("Leave request not found"));
        if (leave.getStatus() != DoctorLeaveStatus.PENDING)
            throw new IllegalArgumentException("This leave request has already been decided");

        leave.setStatus(decision.status());
        leave.setAdminComment(decision.comment() == null || decision.comment().isBlank()
                ? null : decision.comment().trim());
        leave.setDecidedAt(LocalDateTime.now());
        DoctorLeave saved = leaves.save(leave);
        if (saved.getStatus() == DoctorLeaveStatus.APPROVED) scheduleConflicts.refresh(doctor);

        String dates = formatLeaveDate(saved.getStartDate()) + " to " + formatLeaveDate(saved.getEndDate());
        if (saved.getStatus() == DoctorLeaveStatus.APPROVED) {
            notifications.notifyUserOnce(doctor.getUser(), "LEAVE_REQUEST_APPROVED",
                    "Your leave request for " + dates + " has been approved.", saved.getId());
        } else {
            String reason = saved.getAdminComment() == null ? ""
                    : " Reason: " + saved.getAdminComment();
            notifications.notifyUserOnce(doctor.getUser(), "LEAVE_REQUEST_REJECTED",
                    "Your leave request for " + dates + " has been rejected." + reason, saved.getId());
        }
        return response(saved);
    }

    @Transactional
    public void delete(String email, Long id) {
        DoctorLeave leave = leaves.findById(id).orElseThrow(() -> new IllegalArgumentException("Leave not found"));
        if (!leave.getDoctor().getUser().getEmail().equalsIgnoreCase(email))
            throw new UnauthorizedAccessException("You can only manage your own leave");
        doctors.findByIdForUpdate(leave.getDoctor().getId())
                .orElseThrow(() -> new IllegalArgumentException("Doctor profile not found"));
        leave = leaves.findById(id).orElseThrow(() -> new IllegalArgumentException("Leave not found"));
        if (leave.getStatus() != DoctorLeaveStatus.PENDING)
            throw new IllegalArgumentException("Only pending leave requests can be removed");
        leaves.delete(leave);
    }

    @Transactional
    public void removeAsAdmin(Long id) {
        DoctorLeave leave = leaves.findById(id).orElseThrow(() -> new IllegalArgumentException("Leave not found"));
        Doctor doctor = doctors.findByIdForUpdate(leave.getDoctor().getId())
                .orElseThrow(() -> new IllegalArgumentException("Doctor profile not found"));
        leave = leaves.findById(id).orElseThrow(() -> new IllegalArgumentException("Leave not found"));
        boolean wasApproved = leave.getStatus() == DoctorLeaveStatus.APPROVED;
        leaves.delete(leave);
        leaves.flush();
        if (wasApproved) scheduleConflicts.refresh(doctor);
        if (wasApproved) {
            notifications.notifyUserOnce(doctor.getUser(), "LEAVE_REQUEST_CANCELLED",
                    "Your approved leave for " + formatLeaveDate(leave.getStartDate()) + " to "
                            + formatLeaveDate(leave.getEndDate()) + " was cancelled by an administrator.",
                    leave.getId());
        }
    }

    private String formatLeaveDate(LocalDate date) {
        return LEAVE_DATE_FORMAT.format(date);
    }

    private Doctor doctor(String email) {
        User user = users.findByEmail(email).orElseThrow(() -> new UserNotFoundException("User not found"));
        return doctors.findByUserId(user.getId()).orElseThrow(() -> new IllegalArgumentException("Doctor profile not found"));
    }
    private DoctorLeaveResponse response(DoctorLeave l) {
        return new DoctorLeaveResponse(l.getId(), l.getDoctor().getId(), l.getDoctor().getUser().getName(),
                l.getStartDate(), l.getEndDate(), l.getReason(), l.getStatus(), l.getAdminComment(),
                l.getCreatedAt(), l.getDecidedAt());
    }
}
