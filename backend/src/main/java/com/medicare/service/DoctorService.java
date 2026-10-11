package com.medicare.service;

import com.medicare.dto.DoctorRequest;
import com.medicare.dto.DoctorResponse;
import com.medicare.dto.FeeRequest;
import com.medicare.entity.Doctor;
import com.medicare.entity.Role;
import com.medicare.entity.Specialization;
import com.medicare.entity.User;
import com.medicare.exception.DoctorNotFoundException;
import com.medicare.repository.DoctorRepository;
import com.medicare.repository.SpecializationRepository;
import com.medicare.repository.UserRepository;
import com.medicare.repository.DoctorReviewRepository;
import com.medicare.repository.AppointmentRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class DoctorService {

    private final DoctorRepository doctorRepository;
    private final UserRepository userRepository;
    private final SpecializationRepository specializationRepository;
    private final PasswordEncoder passwordEncoder;
    private final DoctorReviewRepository reviews;
    private final AppointmentRepository appointments;
    private final NotificationService notifications;

    public DoctorService(
            DoctorRepository doctorRepository,
            UserRepository userRepository,
            SpecializationRepository specializationRepository,
            PasswordEncoder passwordEncoder,
            DoctorReviewRepository reviews,
            AppointmentRepository appointments,
            NotificationService notifications) {

        this.doctorRepository = doctorRepository;
        this.userRepository = userRepository;
        this.specializationRepository = specializationRepository;
        this.passwordEncoder = passwordEncoder;
        this.reviews = reviews;
        this.appointments = appointments;
        this.notifications = notifications;
    }

    @Transactional(readOnly = true)
    public List<DoctorResponse> getAllDoctors(Long specializationId) {
        return doctorRepository.findAll()
                .stream()
                .filter(doctor -> doctor.isActive() && doctor.getUser().isActive())
                .filter(doctor -> specializationId == null || doctor.getSpecialization().getId().equals(specializationId))
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DoctorResponse> getAllDoctorsForAdmin(Long specializationId) {
        return doctorRepository.findAll().stream()
                .filter(doctor -> specializationId == null || doctor.getSpecialization().getId().equals(specializationId))
                .map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public DoctorResponse getDoctorById(Long id) {
        return toResponse(findDoctor(id));
    }

    @Transactional
    public DoctorResponse updateConsultationFee(Long id, FeeRequest request) {
        Doctor doctor = findDoctor(id);
        doctor.setConsultationFee(request.consultationFee());
        return toResponse(doctorRepository.save(doctor));
    }

    @Transactional
    public DoctorResponse useSpecializationFee(Long id) {
        Doctor doctor = findDoctor(id);
        doctor.setConsultationFee(null);
        return toResponse(doctorRepository.save(doctor));
    }

    @Transactional
    public DoctorResponse updateStatus(Long id, boolean active) {
        Doctor doctor = findDoctor(id);
        if (doctor.isActive() == active && doctor.getUser().isActive() == active)
            return toResponse(doctor);
        doctor.setActive(active);
        doctor.getUser().setActive(active);
        userRepository.save(doctor.getUser());
        if (!active) {
            appointments.findByDoctorIdAndAppointmentDateBetweenAndStatusIn(doctor.getId(),
                    java.time.LocalDateTime.now(), java.time.LocalDateTime.now().plusDays(90),
                    List.of(com.medicare.entity.AppointmentStatus.PENDING, com.medicare.entity.AppointmentStatus.CONFIRMED))
                    .forEach(appointment -> notifications.notifyUser(appointment.getBookedBy(), "DOCTOR_UNAVAILABLE",
                            "Dr. " + doctor.getUser().getName() + " is temporarily unavailable. Please contact the clinic to reschedule.",
                            appointment.getId()));
        }
        return toResponse(doctorRepository.save(doctor));
    }

    @Transactional
    public DoctorResponse createDoctor(DoctorRequest request) {
        if (request.password() == null || request.password().isBlank())
            throw new IllegalArgumentException("Doctor password is required");

        Specialization specialization = specializationRepository
                .findById(request.specializationId())
                .orElseThrow(() ->
                        new IllegalArgumentException("Specialization not found"));

        String email = request.email().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException(
                    "A user with this email already exists");
        }

        User user = new User(
                request.name().trim(),
                email,
                passwordEncoder.encode(request.password()),
                Role.DOCTOR
        );

        user = userRepository.save(user);

        Doctor doctor = new Doctor(user, specialization);

        return toResponse(doctorRepository.save(doctor));
    }

    @Transactional
    public DoctorResponse updateDoctor(Long id, DoctorRequest request) {

        Doctor doctor = findDoctor(id);

        Specialization specialization = specializationRepository
                .findById(request.specializationId())
                .orElseThrow(() ->
                        new IllegalArgumentException("Specialization not found"));

        User user = doctor.getUser();

        user.setName(request.name().trim());

        String email = request.email().trim().toLowerCase();
        if (!user.getEmail().equalsIgnoreCase(email)
                && userRepository.existsByEmail(email)) {

            throw new IllegalArgumentException(
                    "A user with this email already exists");
        }

        user.setEmail(email);

        if (request.password() != null && !request.password().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.password()));
        }

        userRepository.save(user);

        doctor.setSpecialization(specialization);

        return toResponse(doctorRepository.save(doctor));
    }

    @Transactional
    public void deleteDoctor(Long id) {

        Doctor doctor = findDoctor(id);
        User user = doctor.getUser();
        doctorRepository.delete(doctor);
        userRepository.delete(user);
    }

    private Doctor findDoctor(Long id) {
        return doctorRepository.findById(id)
                .orElseThrow(() ->
                        new DoctorNotFoundException(
                                "Doctor not found with id " + id));
    }

    private DoctorResponse toResponse(Doctor doctor) {

        User user = doctor.getUser();
        Specialization specialization = doctor.getSpecialization();

        return new DoctorResponse(
                doctor.getId(),
                user.getId(),
                user.getName(),
                user.getEmail(),
                specialization.getId(),
                specialization.getName(),
                doctor.getConsultationFee() == null
                        ? specialization.getConsultationFee()
                        : doctor.getConsultationFee(),
                doctor.getCreatedAt(),
                user.getProfilePhotoUrl(), doctor.getBio(), doctor.getQualifications(),
                doctor.getExperienceYears(), doctor.getPhone(), doctor.isActive() && user.isActive(),
                doctor.getAvailabilities().stream().anyMatch(com.medicare.entity.Availability::isActive),
                reviews.averageRating(doctor.getId()), reviews.countApprovedByDoctorId(doctor.getId())
        );
    }
}
