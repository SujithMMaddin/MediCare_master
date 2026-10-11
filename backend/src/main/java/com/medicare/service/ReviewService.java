package com.medicare.service;

import com.medicare.dto.ReviewRequest;
import com.medicare.dto.ReviewResponse;
import com.medicare.entity.*;
import com.medicare.exception.UserNotFoundException;
import com.medicare.exception.UnauthorizedAccessException;
import com.medicare.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class ReviewService {
    private final UserRepository users;
    private final AppointmentRepository appointments;
    private final DoctorReviewRepository reviews;
    public ReviewService(UserRepository users, AppointmentRepository appointments, DoctorReviewRepository reviews) {
        this.users=users; this.appointments=appointments; this.reviews=reviews;
    }
    @Transactional
    public ReviewResponse create(String email, Long appointmentId, ReviewRequest request) {
        User patient = user(email);
        Appointment appointment = appointments.findById(appointmentId)
                .orElseThrow(() -> new IllegalArgumentException("Appointment not found"));
        if (!appointment.getBookedBy().getId().equals(patient.getId()))
            throw new UnauthorizedAccessException("You can only review appointments booked by your account");
        if (appointment.getStatus() != AppointmentStatus.COMPLETED)
            throw new IllegalArgumentException("Reviews are allowed only after an appointment is completed");
        if (reviews.existsByAppointmentId(appointmentId))
            throw new IllegalArgumentException("This appointment already has a review");
        DoctorReview saved = reviews.save(new DoctorReview(appointment, patient, appointment.getDoctor(),
                request.rating(), request.comment() == null ? null : request.comment().trim()));
        return response(saved, false);
    }
    @Transactional(readOnly = true)
    public List<ReviewResponse> forDoctor(Long doctorId) {
        return reviews.findByDoctorIdAndApprovedTrueOrderByCreatedAtDesc(doctorId).stream()
                .map(r -> response(r, true)).toList();
    }
    @Transactional(readOnly = true)
    public List<ReviewResponse> allForAdmin() {
        return reviews.findAllByOrderByCreatedAtDesc().stream().map(r -> response(r, false)).toList();
    }
    @Transactional(readOnly = true)
    public List<ReviewResponse> mine(String email) {
        return reviews.findByPatientIdOrderByCreatedAtDesc(user(email).getId()).stream()
                .map(r -> response(r, false)).toList();
    }
    @Transactional
    public ReviewResponse moderate(Long id, boolean approved) {
        DoctorReview review = reviews.findById(id).orElseThrow(() -> new IllegalArgumentException("Review not found"));
        review.setApproved(approved);
        return response(reviews.save(review), false);
    }
    @Transactional
    public void delete(Long id) {
        if (!reviews.existsById(id)) throw new IllegalArgumentException("Review not found");
        reviews.deleteById(id);
    }
    private User user(String email) {
        return users.findByEmail(email).orElseThrow(() -> new UserNotFoundException("User not found"));
    }
    private ReviewResponse response(DoctorReview r, boolean publicView) {
        return new ReviewResponse(r.getId(), r.getAppointment().getId(), r.getDoctor().getId(),
                r.getDoctor().getUser().getName(), publicView ? "Verified patient" : r.getPatient().getName(),
                r.getRating(), r.getComment(), r.isApproved(), r.getCreatedAt());
    }
}
