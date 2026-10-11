package com.medicare.service;

import com.medicare.dto.AppointmentRequest;
import com.medicare.dto.AppointmentResponse;
import com.medicare.dto.AvailableSlotResponse;
import com.medicare.entity.Appointment;
import com.medicare.entity.AppointmentStatus;
import com.medicare.entity.Doctor;
import com.medicare.entity.DoctorLeaveStatus;
import com.medicare.entity.Specialization;
import com.medicare.entity.PatientProfile;
import com.medicare.entity.User;
import com.medicare.entity.BillingRecord;
import java.math.BigDecimal;
import com.medicare.repository.AppointmentRepository;
import com.medicare.repository.DoctorRepository;
import com.medicare.repository.UserRepository;
import com.medicare.repository.PatientProfileRepository;
import com.medicare.repository.DoctorLeaveRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.medicare.exception.InvalidAppointmentException;
import com.medicare.exception.UnauthorizedAccessException;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.HashSet;

@Service
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final UserRepository userRepository;
    private final DoctorRepository doctorRepository;
    private final PatientProfileRepository profileRepository;
    private final BookingRateLimiter rateLimiter;
    private final BillingService billingService;
    private final DoctorLeaveRepository leaveRepository;
    private final NotificationService notifications;
    private final int maxActiveAppointments;
    @Value("${medicare.booking.no-show-grace-minutes:15}")
    private int noShowGraceMinutes = 15;

    public AppointmentService(
            AppointmentRepository appointmentRepository,
            UserRepository userRepository,
            DoctorRepository doctorRepository,
            PatientProfileRepository profileRepository,
            BookingRateLimiter rateLimiter,
            BillingService billingService,
            DoctorLeaveRepository leaveRepository,
            NotificationService notifications,
            @Value("${medicare.booking.max-active-appointments:3}") int maxActiveAppointments) {

        this.appointmentRepository = appointmentRepository;
        this.userRepository = userRepository;
        this.doctorRepository = doctorRepository;
        this.profileRepository = profileRepository;
        this.rateLimiter = rateLimiter;
        this.billingService = billingService;
        this.leaveRepository = leaveRepository;
        this.notifications = notifications;
        this.maxActiveAppointments = maxActiveAppointments;
    }

    @Transactional
    public AppointmentResponse bookAppointment(
            String patientEmail,
            AppointmentRequest request) {

        User account = userRepository.findByEmail(patientEmail)
                .orElseThrow(() ->
                        new InvalidAppointmentException("Booking account was not found"));

        account = userRepository.findByIdForUpdate(account.getId()).orElseThrow();
        rateLimiter.checkAndRecord(account.getId());

        List<AppointmentStatus> activeStatuses = List.of(AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED);
        long activeCount = appointmentRepository.countByBookedByIdAndStatusInAndAppointmentDateAfter(
                account.getId(), activeStatuses, LocalDateTime.now());
        if (activeCount >= maxActiveAppointments) {
            throw new InvalidAppointmentException("You can have up to " + maxActiveAppointments + " active upcoming appointments.");
        }

        PatientProfile patientProfile = profileRepository.findByIdAndOwnerId(request.patientProfileId(), account.getId())
                .orElseThrow(() -> new UnauthorizedAccessException("You cannot book appointments for this patient profile"));

        Doctor selectedDoctor = doctorRepository.findByIdForUpdate(request.doctorId())
                .orElseThrow(() -> new InvalidAppointmentException("Doctor not found"));
        if (!selectedDoctor.isActive() || !selectedDoctor.getUser().isActive())
            throw new InvalidAppointmentException("This doctor is not currently accepting appointments");

        if (request.specializationId() != null &&
                !selectedDoctor.getSpecialization().getId().equals(request.specializationId())) {
            throw new InvalidAppointmentException("Doctor does not belong to the selected specialization");
        }

        BigDecimal consultationFee = selectedDoctor.getConsultationFee() == null
                ? selectedDoctor.getSpecialization().getConsultationFee()
                : selectedDoctor.getConsultationFee();
        if (consultationFee == null || consultationFee.signum() <= 0) {
            throw new InvalidAppointmentException(
                    "Consultation fee is not configured for this doctor yet");
        }

        LocalDateTime appointmentDate = request.appointmentDate();

        if (!appointmentDate.isAfter(LocalDateTime.now())) {
            throw new InvalidAppointmentException(
                    "Appointment date must be in the future");
        }
        if (appointmentDate.toLocalDate().isAfter(LocalDate.now().plusDays(89))) {
            throw new InvalidAppointmentException("Appointments can only be booked within the next 90 days.");
        }

        Integer requestedDuration = getSlotDuration(selectedDoctor, appointmentDate);
        if (requestedDuration == null) {
            throw new InvalidAppointmentException(
                    "Doctor is not available at the selected time");
        }
        if (leaveRepository.existsByDoctorIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                selectedDoctor.getId(), DoctorLeaveStatus.APPROVED,
                appointmentDate.toLocalDate(), appointmentDate.toLocalDate()))
            throw new InvalidAppointmentException("The doctor is on leave for the selected date");

        boolean slotOccupied =
                appointmentRepository
                        .existsByDoctorIdAndAppointmentDateAndStatusIn(
                                selectedDoctor.getId(),
                                appointmentDate,
                                List.of(
                                        AppointmentStatus.PENDING,
                                        AppointmentStatus.CONFIRMED
                                )
                        );

        if (slotOccupied) {
            throw new InvalidAppointmentException(
                    "The selected appointment slot is already booked");
        }

        for (Appointment existing : appointmentRepository
                .findByPatientProfileIdAndStatusInAndAppointmentDateAfter(patientProfile.getId(), activeStatuses, LocalDateTime.now())) {
            int existingDuration = getSlotDuration(existing.getDoctor(), existing.getAppointmentDate()) == null
                    ? 30 : getSlotDuration(existing.getDoctor(), existing.getAppointmentDate());
            LocalDateTime existingEnd = existing.getAppointmentDate().plusMinutes(existingDuration);
            LocalDateTime requestedEnd = appointmentDate.plusMinutes(requestedDuration);
            if (appointmentDate.isBefore(existingEnd) && existing.getAppointmentDate().isBefore(requestedEnd)) {
                throw new InvalidAppointmentException("This patient already has an overlapping active appointment.");
            }
        }

        Appointment appointment = new Appointment(
                appointmentDate,
                AppointmentStatus.PENDING,
                request.reason(),
                account,
                patientProfile,
                selectedDoctor
        );

        Appointment savedAppointment =
                appointmentRepository.save(appointment);
        savedAppointment.setConsultationFee(consultationFee);
        BillingRecord billingRecord = billingService.createForAppointment(savedAppointment, consultationFee);
        savedAppointment.setBillingRecord(billingRecord);
        notifications.notifyUser(account, "APPOINTMENT_BOOKED", "Your appointment with Dr. " +
                selectedDoctor.getUser().getName() + " has been booked and is awaiting confirmation.", savedAppointment.getId());
        notifications.notifyUser(selectedDoctor.getUser(), "APPOINTMENT_BOOKED", "A new appointment has been booked.", savedAppointment.getId());

        return toResponse(savedAppointment);
    }

    @Transactional
    public AppointmentResponse rescheduleAppointment(Long id, LocalDateTime newDate, String patientEmail) {
        User patient = userRepository.findByEmail(patientEmail)
                .orElseThrow(() -> new InvalidAppointmentException("Patient not found"));
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new InvalidAppointmentException("Appointment not found"));
        if (!appointment.getBookedBy().getId().equals(patient.getId()))
            throw new UnauthorizedAccessException("You can only reschedule your own appointments");
        if (appointment.getStatus() != AppointmentStatus.PENDING && appointment.getStatus() != AppointmentStatus.CONFIRMED)
            throw new InvalidAppointmentException("Only pending or confirmed appointments can be rescheduled");
        if (newDate == null || !newDate.isAfter(LocalDateTime.now()) ||
                newDate.toLocalDate().isAfter(LocalDate.now().plusDays(89)))
            throw new InvalidAppointmentException("Choose a future appointment date within the next 90 days");
        Doctor doctor = doctorRepository.findByIdForUpdate(appointment.getDoctor().getId())
                .orElseThrow(() -> new InvalidAppointmentException("Doctor not found"));
        if (!doctor.isActive() || !doctor.getUser().isActive())
            throw new InvalidAppointmentException("This doctor is not currently accepting appointments");
        Integer duration = getSlotDuration(doctor, newDate);
        if (duration == null) throw new InvalidAppointmentException("Doctor is not available at the selected time");
        if (leaveRepository.existsByDoctorIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                doctor.getId(), DoctorLeaveStatus.APPROVED, newDate.toLocalDate(), newDate.toLocalDate()))
            throw new InvalidAppointmentException("The doctor is on leave for the selected date");
        List<AppointmentStatus> active = List.of(AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED);
        if (!appointmentRepository.findOtherActiveAtDoctorSlot(doctor.getId(), newDate, active, id).isEmpty())
            throw new InvalidAppointmentException("The selected appointment slot is already booked");
        if (appointment.getPatientProfile() != null) {
            for (Appointment other : appointmentRepository.findOtherActiveByPatientProfile(
                    appointment.getPatientProfile().getId(), active, LocalDateTime.now(), id)) {
                Integer otherDuration = getSlotDuration(other.getDoctor(), other.getAppointmentDate());
                LocalDateTime otherEnd = other.getAppointmentDate().plusMinutes(otherDuration == null ? 30 : otherDuration);
                if (newDate.isBefore(otherEnd) && other.getAppointmentDate().isBefore(newDate.plusMinutes(duration)))
                    throw new InvalidAppointmentException("This patient already has an overlapping active appointment.");
            }
        }
        if (appointmentRepository.countOtherActiveByAccount(patient.getId(), active, LocalDateTime.now(), id) >= maxActiveAppointments)
            throw new InvalidAppointmentException("You can have up to " + maxActiveAppointments + " active upcoming appointments.");
        appointment.setAppointmentDate(newDate);
        appointment.setStatus(AppointmentStatus.PENDING);
        appointment.setScheduleConflict(false);
        Appointment saved = appointmentRepository.save(appointment);
        notifications.notifyUser(patient, "APPOINTMENT_RESCHEDULED", "Your appointment with Dr. " +
                doctor.getUser().getName() + " was rescheduled and is awaiting confirmation.", id);
        notifications.notifyUser(doctor.getUser(), "APPOINTMENT_RESCHEDULED", "A patient rescheduled an appointment.", id);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> getMyAppointments(
            String patientEmail) {

        User patient = userRepository.findByEmail(patientEmail)
                .orElseThrow(() ->
                        new InvalidAppointmentException("Patient not found"));

        return appointmentRepository
                .findByBookedByIdOrderByAppointmentDateDesc(patient.getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> getDoctorAppointments(
            String doctorEmail) {

        User doctorUser = userRepository.findByEmail(doctorEmail)
                .orElseThrow(() ->
                        new InvalidAppointmentException("Doctor not found"));

        Doctor doctor = doctorRepository.findById(doctorUser.getDoctor().getId())
                .orElseThrow(() ->
                        new InvalidAppointmentException("Doctor profile not found"));

        return appointmentRepository
                .findByDoctorIdOrderByAppointmentDateDesc(doctor.getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> getAllAppointments() {

        return appointmentRepository
                .findAllByOrderByAppointmentDateDesc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public AppointmentResponse cancelAppointment(
            Long appointmentId,
            String patientEmail) {

        User patient = userRepository.findByEmail(patientEmail)
                .orElseThrow(() ->
                        new InvalidAppointmentException("Patient not found"));

        Appointment appointment =
                appointmentRepository.findByIdForUpdate(appointmentId)
                        .orElseThrow(() ->
                                new InvalidAppointmentException(
                                        "Appointment not found"));

        if (!appointment.getBookedBy().getId().equals(patient.getId())) {
            throw new UnauthorizedAccessException(
                    "You can only cancel your own appointments");
        }

        if (appointment.getStatus() != AppointmentStatus.PENDING &&
                appointment.getStatus() != AppointmentStatus.CONFIRMED) {

            throw new InvalidAppointmentException(
                    "Only pending or confirmed appointments can be cancelled");
        }

        appointment.setStatus(AppointmentStatus.CANCELLED);
        Appointment saved = appointmentRepository.save(appointment);
        notifications.notifyUser(saved.getDoctor().getUser(), "APPOINTMENT_CANCELLED",
                "An appointment has been cancelled by the patient.", appointmentId);
        notifications.notifyUser(patient, "APPOINTMENT_CANCELLED",
                "Your appointment was cancelled.", appointmentId);
        return toResponse(saved);
    }

    @Transactional
    public AppointmentResponse confirmAppointment(
            Long appointmentId,
            String doctorEmail) {

        Appointment appointment =
                getDoctorOwnedAppointment(appointmentId, doctorEmail);

        if (appointment.getStatus() != AppointmentStatus.PENDING) {
            throw new InvalidAppointmentException(
                    "Only pending appointments can be confirmed");
        }

        appointment.setStatus(AppointmentStatus.CONFIRMED);
        Appointment saved = appointmentRepository.save(appointment);
        notifications.notifyUser(saved.getBookedBy(), "APPOINTMENT_CONFIRMED",
                "Your appointment with Dr. " + saved.getDoctor().getUser().getName() + " was confirmed.", appointmentId);
        return toResponse(saved);
    }

    @Transactional
    public AppointmentResponse rejectAppointment(
            Long appointmentId,
            String doctorEmail) {

        Appointment appointment =
                getDoctorOwnedAppointment(appointmentId, doctorEmail);

        if (appointment.getStatus() != AppointmentStatus.PENDING) {
            throw new InvalidAppointmentException(
                    "Only pending appointments can be rejected");
        }

        appointment.setStatus(AppointmentStatus.REJECTED);
        Appointment saved = appointmentRepository.save(appointment);
        notifications.notifyUser(saved.getBookedBy(), "APPOINTMENT_REJECTED",
                "Your appointment request was declined by Dr. " + saved.getDoctor().getUser().getName() + ".", appointmentId);
        return toResponse(saved);
    }

    @Transactional
    public AppointmentResponse completeAppointment(
            Long appointmentId,
            String doctorEmail) {

        Appointment appointment =
                getDoctorOwnedAppointment(appointmentId, doctorEmail);

        if (appointment.getStatus() != AppointmentStatus.CONFIRMED) {
            throw new InvalidAppointmentException(
                    "Only confirmed appointments can be completed");
        }

        appointment.setStatus(AppointmentStatus.COMPLETED);
        Appointment saved = appointmentRepository.save(appointment);
        notifications.notifyUser(saved.getBookedBy(), "APPOINTMENT_COMPLETED",
                "Your appointment is complete. You can now rate your experience.", appointmentId);
        return toResponse(saved);
    }

    @Transactional
    public AppointmentResponse markNoShow(
            Long appointmentId,
            String doctorEmail) {

        Appointment appointment =
                getDoctorOwnedAppointment(appointmentId, doctorEmail);

        if (appointment.getStatus() != AppointmentStatus.CONFIRMED) {
            throw new InvalidAppointmentException(
                    "Only confirmed appointments can be marked as no-show");
        }

        if (appointment.getAppointmentDate().plusMinutes(Math.max(0, noShowGraceMinutes)).isAfter(LocalDateTime.now())) {
            throw new InvalidAppointmentException(
                    "An appointment can be marked as no-show only after the " + Math.max(0, noShowGraceMinutes) + " minute grace period");
        }

        appointment.setStatus(AppointmentStatus.NO_SHOW);
        Appointment saved = appointmentRepository.save(appointment);
        notifications.notifyUserOnce(saved.getBookedBy(), "APPOINTMENT_NO_SHOW",
                "Your appointment was recorded as a no-show.", appointmentId);
        return toResponse(saved);
    }

    private Appointment getDoctorOwnedAppointment(
            Long appointmentId,
            String doctorEmail) {

        User doctorUser = userRepository.findByEmail(doctorEmail)
                .orElseThrow(() ->
                        new InvalidAppointmentException("Doctor not found"));

        Doctor doctor = doctorUser.getDoctor();

        if (doctor == null) {
            throw new InvalidAppointmentException(
                    "Doctor profile not found");
        }

        Appointment appointment =
                appointmentRepository.findByIdForUpdate(appointmentId)
                        .orElseThrow(() ->
                                new InvalidAppointmentException(
                                        "Appointment not found"));

        if (!appointment.getDoctor().getId().equals(doctor.getId())) {
            throw new InvalidAppointmentException(
                    "You can only manage your own appointments");
        }

        return appointment;
    }

    @Transactional(readOnly = true)
    public List<AvailableSlotResponse> getAvailableSlots(Long doctorId, LocalDate from, LocalDate to) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new InvalidAppointmentException("Doctor not found"));
        if (!doctor.isActive() || !doctor.getUser().isActive()) return List.of();
        LocalDate today = LocalDate.now();
        if (from == null || to == null || from.isBefore(today) || to.isBefore(from)
                || to.isAfter(today.plusDays(89)) || java.time.temporal.ChronoUnit.DAYS.between(from, to) > 89) {
            throw new IllegalArgumentException("Choose a date range within the next 90 days.");
        }
        List<AvailableSlotResponse> availableSlots = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
        Set<LocalDateTime> occupied = new HashSet<>(appointmentRepository.findOccupiedAppointmentDates(
                doctorId, from.atStartOfDay(), to.plusDays(1).atStartOfDay(),
                List.of(AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED)));
        Set<LocalDate> leaveDates = new HashSet<>();
        leaveRepository.findByDoctorIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                doctorId, DoctorLeaveStatus.APPROVED, to, from)
                .forEach(leave -> {
                    for (LocalDate date = leave.getStartDate().isBefore(from) ? from : leave.getStartDate();
                         !date.isAfter(to) && !date.isAfter(leave.getEndDate()); date = date.plusDays(1)) leaveDates.add(date);
                });
        for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {
            if (leaveDates.contains(date)) continue;
            DayOfWeek dayOfWeek = date.getDayOfWeek();
            LocalDate slotDate = date;
            doctor.getAvailabilities()
                        .stream()
                        .filter(availability ->
                                availability.isActive() && availability.getDayOfWeek() == dayOfWeek)
                        .forEach(availability -> {

                            LocalTime slotTime =
                                    availability.getStartTime();

                            while (
                                    slotTime
                                            .plusMinutes(
                                                    availability
                                                            .getSlotDurationMinutes())
                                            .compareTo(
                                                    availability.getEndTime()) <= 0
                            ) {

                                LocalDateTime slotDateTime =
                                        LocalDateTime.of(slotDate, slotTime);

                                // Don't show slots that have already passed
                                if (!slotDateTime.isBefore(now)) {

                                    if (!occupied.contains(slotDateTime)) {

                                        AvailableSlotResponse slot =
                                                new AvailableSlotResponse(
                                                        slotDate,
                                                        slotTime
                                                );

                                        if (!availableSlots.contains(slot)) availableSlots.add(slot);
                                    }
                                }

                                slotTime = slotTime.plusMinutes(
                                        availability.getSlotDurationMinutes());
                            }
                        });
        }

        availableSlots.sort(
                Comparator.comparing(AvailableSlotResponse::date)
                        .thenComparing(AvailableSlotResponse::time)
        );

        return availableSlots;
    }

    @Transactional(readOnly = true)
    public com.medicare.dto.AvailabilitySearchResponse getAvailabilitySearch(Long doctorId, LocalDate from, LocalDate to) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new InvalidAppointmentException("Doctor not found"));
        List<AvailableSlotResponse> slots = getAvailableSlots(doctorId, from, to);
        if (!doctor.isActive() || !doctor.getUser().isActive()) return new com.medicare.dto.AvailabilitySearchResponse(List.of(), "DOCTOR_UNAVAILABLE");
        if (doctor.getAvailabilities().stream().noneMatch(a -> a.isActive())) return new com.medicare.dto.AvailabilitySearchResponse(slots, "NO_SCHEDULE");
        LocalDateTime now = LocalDateTime.now();
        boolean hasWorkingDate = false;
        boolean hasNonLeaveCandidate = false;
        for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {
            LocalDate slotDate = date;
            List<com.medicare.entity.Availability> daySchedules = doctor.getAvailabilities().stream()
                    .filter(a -> a.isActive() && a.getDayOfWeek() == slotDate.getDayOfWeek()).toList();
            if (daySchedules.isEmpty()) continue;
            boolean hasFutureSlot = daySchedules.stream().anyMatch(a -> {
                for (LocalTime time = a.getStartTime(); time.plusMinutes(a.getSlotDurationMinutes()).compareTo(a.getEndTime()) <= 0; time = time.plusMinutes(a.getSlotDurationMinutes()))
                    if (!LocalDateTime.of(slotDate, time).isBefore(now)) return true;
                return false;
            });
            if (!hasFutureSlot) continue;
            hasWorkingDate = true;
            boolean onLeave = leaveRepository.existsByDoctorIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                    doctorId, DoctorLeaveStatus.APPROVED, date, date);
            if (!onLeave) hasNonLeaveCandidate = true;
        }
        if (!hasWorkingDate) return new com.medicare.dto.AvailabilitySearchResponse(slots, "NO_WORKING_DAYS");
        if (slots.isEmpty() && !hasNonLeaveCandidate) return new com.medicare.dto.AvailabilitySearchResponse(slots, "APPROVED_LEAVE");
        return new com.medicare.dto.AvailabilitySearchResponse(slots, slots.isEmpty() ? "FULLY_BOOKED" : "AVAILABLE");
    }

    private Integer getSlotDuration(Doctor doctor, LocalDateTime appointmentDate) {
        if (appointmentDate.getSecond() != 0 || appointmentDate.getNano() != 0) return null;
        DayOfWeek dayOfWeek = appointmentDate.getDayOfWeek();
        LocalTime appointmentTime = appointmentDate.toLocalTime();
        return doctor.getAvailabilities().stream().filter(availability ->
                availability.isActive() &&
                availability.getDayOfWeek() == dayOfWeek &&
                !appointmentTime.isBefore(availability.getStartTime()) &&
                appointmentTime.plusMinutes(availability.getSlotDurationMinutes()).compareTo(availability.getEndTime()) <= 0 &&
                isValidSlot(appointmentTime, availability.getStartTime(), availability.getSlotDurationMinutes()))
                .map(availability -> availability.getSlotDurationMinutes())
                .findFirst().orElse(null);
    }

    private boolean isValidSlot(
            LocalTime appointmentTime,
            LocalTime startTime,
            Integer slotDurationMinutes) {

        long minutes =
                java.time.Duration.between(
                        startTime,
                        appointmentTime
                ).toMinutes();

        return minutes >= 0 &&
                minutes % slotDurationMinutes == 0;
    }

    private AppointmentResponse toResponse(
            Appointment appointment) {

        Doctor doctor = appointment.getDoctor();
        User doctorUser = doctor.getUser();
        Specialization specialization =
                doctor.getSpecialization();

        User account = appointment.getBookedBy();
        PatientProfile profile = appointment.getPatientProfile();
        String patientName = profile == null ? account.getName() : profile.getFullName();
        Long patientProfileId = profile == null ? null : profile.getId();
        String relationship = profile == null ? "SELF" : profile.getRelationship().name();

        BillingRecord billingRecord = appointment.getBillingRecord();
        BigDecimal consultationFee = appointment.getConsultationFee();
        if (consultationFee == null) {
            consultationFee = doctor.getConsultationFee() == null
                    ? specialization.getConsultationFee()
                    : doctor.getConsultationFee();
        }

        return new AppointmentResponse(
                appointment.getId(),
                appointment.getAppointmentDate(),
                appointment.getStatus(),
                appointment.getReason(),

                account.getId(),
                account.getName(),
                account.getEmail(),
                patientProfileId,
                patientName,
                relationship,

                doctor.getId(),
                doctorUser.getName(),
                doctorUser.getEmail(),
                specialization.getId(),
                specialization.getName(),

                appointment.getCreatedAt(),
                appointment.getAppointmentDate() == null ? null : appointment.getAppointmentDate().plusMinutes(Math.max(0, noShowGraceMinutes)),
                consultationFee,
                consultationFee,
                billingRecord == null ? com.medicare.entity.PaymentStatus.PENDING : billingRecord.getStatus(),
                billingRecord == null ? null : billingRecord.getId(),
                appointment.isScheduleConflict()
        );
    }
}
