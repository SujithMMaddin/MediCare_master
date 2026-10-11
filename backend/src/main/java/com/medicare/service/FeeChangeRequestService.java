package com.medicare.service;

import com.medicare.dto.*;
import com.medicare.entity.*;
import com.medicare.exception.UserNotFoundException;
import com.medicare.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class FeeChangeRequestService {
    private final UserRepository users;
    private final DoctorRepository doctors;
    private final FeeChangeRequestRepository requests;
    private final NotificationService notifications;
    public FeeChangeRequestService(UserRepository users, DoctorRepository doctors, FeeChangeRequestRepository requests,
            NotificationService notifications) {
        this.users=users; this.doctors=doctors; this.requests=requests; this.notifications=notifications;
    }
    @Transactional
    public FeeChangeRequestResponse create(String email, FeeChangeRequestCreate request) {
        Doctor doctor = ownDoctor(email);
        if (requests.existsByDoctorIdAndStatus(doctor.getId(), FeeRequestStatus.PENDING))
            throw new IllegalArgumentException("You already have a pending fee change request");
        FeeChangeRequest saved = requests.save(new FeeChangeRequest(doctor, request.proposedFee(), request.reason().trim()));
        notifications.notifyAdmins("FEE_CHANGE_REQUEST", "Dr. " + doctor.getUser().getName() + " requested a consultation fee change.", saved.getId());
        return response(saved);
    }
    @Transactional(readOnly = true)
    public List<FeeChangeRequestResponse> mine(String email) {
        return requests.findByDoctorIdOrderByCreatedAtDesc(ownDoctor(email).getId()).stream().map(this::response).toList();
    }
    @Transactional(readOnly = true)
    public List<FeeChangeRequestResponse> all() {
        return requests.findAllByOrderByCreatedAtDesc().stream().map(this::response).toList();
    }
    @Transactional
    public FeeChangeRequestResponse decide(Long id, FeeChangeDecision decision) {
        FeeChangeRequest r = requests.findById(id).orElseThrow(() -> new IllegalArgumentException("Fee request not found"));
        if (r.getStatus() != FeeRequestStatus.PENDING) throw new IllegalArgumentException("This fee request has already been decided");
        if (decision.status() != FeeRequestStatus.APPROVED && decision.status() != FeeRequestStatus.REJECTED)
            throw new IllegalArgumentException("Decision must be APPROVED or REJECTED");
        if (decision.status() == FeeRequestStatus.REJECTED && (decision.comment() == null || decision.comment().isBlank()))
            throw new IllegalArgumentException("A reason is required when rejecting a fee request");
        r.setStatus(decision.status()); r.setAdminComment(decision.comment() == null ? null : decision.comment().trim());
        r.setDecidedAt(LocalDateTime.now());
        if (decision.status() == FeeRequestStatus.APPROVED) r.getDoctor().setConsultationFee(r.getProposedFee());
        notifications.notifyUser(r.getDoctor().getUser(), "FEE_REQUEST_DECISION",
                "Your consultation fee request was " + decision.status().name().toLowerCase() +
                        (r.getAdminComment() == null ? "." : ": " + r.getAdminComment()), r.getId());
        return response(requests.save(r));
    }
    private Doctor ownDoctor(String email) {
        User u=users.findByEmail(email).orElseThrow(() -> new UserNotFoundException("User not found"));
        return doctors.findByUserId(u.getId()).orElseThrow(() -> new IllegalArgumentException("Doctor profile not found"));
    }
    private FeeChangeRequestResponse response(FeeChangeRequest r) {
        return new FeeChangeRequestResponse(r.getId(), r.getDoctor().getId(), r.getDoctor().getUser().getName(),
                r.getProposedFee(), r.getReason(), r.getStatus(), r.getAdminComment(), r.getCreatedAt(), r.getDecidedAt());
    }
}
