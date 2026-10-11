package com.medicare.service;

import com.medicare.dto.AvailabilityRequest;
import com.medicare.dto.AvailabilityResponse;
import com.medicare.entity.Availability;
import com.medicare.entity.Doctor;
import com.medicare.exception.DoctorNotFoundException;
import com.medicare.repository.AvailabilityRepository;
import com.medicare.repository.DoctorRepository;
import com.medicare.repository.UserRepository;
import com.medicare.entity.User;
import com.medicare.entity.Role;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.List;

@Service
public class AvailabilityService {

    private final AvailabilityRepository availabilityRepository;
    private final DoctorRepository doctorRepository;
    private final UserRepository userRepository;
    private final ScheduleConflictService scheduleConflictService;

    public AvailabilityService(
            AvailabilityRepository availabilityRepository,
            DoctorRepository doctorRepository,
            UserRepository userRepository,
            ScheduleConflictService scheduleConflictService) {

        this.availabilityRepository = availabilityRepository;
        this.doctorRepository = doctorRepository;
        this.userRepository = userRepository;
        this.scheduleConflictService = scheduleConflictService;
    }

    @Transactional
    public AvailabilityResponse create(
            Long doctorId,
            AvailabilityRequest request) {

        Doctor doctor = doctorRepository.findByIdForUpdate(doctorId)
                .orElseThrow(() ->
                        new DoctorNotFoundException(
                                "Doctor not found with id " + doctorId));

        if (!request.startTime().isBefore(request.endTime())) {
            throw new IllegalArgumentException(
                    "Start time must be before end time");
        }

        int duration = request.slotDurationMinutes();

        boolean overlapsExisting = availabilityRepository.findByDoctorAndDayOfWeek(doctor, request.dayOfWeek())
                .stream().anyMatch(existing -> request.startTime().isBefore(existing.getEndTime())
                        && existing.getStartTime().isBefore(request.endTime()));
        if (overlapsExisting) {
            throw new IllegalArgumentException("This availability overlaps an existing schedule for that weekday");
        }

        LocalTime lastPossibleStart =
                request.endTime().minusMinutes(duration);

        if (lastPossibleStart.isBefore(request.startTime())) {
            throw new IllegalArgumentException(
                    "Availability window is too short for the selected slot duration");
        }

        Availability availability = new Availability(
                doctor,
                request.dayOfWeek(),
                request.startTime(),
                request.endTime(),
                request.slotDurationMinutes()
        );

        Availability saved = availabilityRepository.save(availability);
        doctor.getAvailabilities().add(saved);
        scheduleConflictService.refresh(doctor);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<AvailabilityResponse> getForDoctor(
            Long doctorId) {

        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() ->
                        new DoctorNotFoundException(
                                "Doctor not found with id " + doctorId));

        return availabilityRepository
                .findByDoctorOrderByDayOfWeekAscStartTimeAsc(doctor)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public AvailabilityResponse updateForDoctor(String email, Long doctorId, Long availabilityId, AvailabilityRequest request) {
        assertOwnDoctor(email, doctorId);
        doctorRepository.findByIdForUpdate(doctorId)
                .orElseThrow(() -> new DoctorNotFoundException("Doctor not found with id " + doctorId));
        Availability availability = availabilityRepository.findById(availabilityId)
                .orElseThrow(() -> new IllegalArgumentException("Availability not found"));
        if (!availability.getDoctor().getId().equals(doctorId))
            throw new IllegalArgumentException("Schedule does not belong to this doctor");
        validateWindow(request);
        boolean overlaps = availabilityRepository.findByDoctorAndDayOfWeek(availability.getDoctor(), request.dayOfWeek())
                .stream().filter(existing -> !existing.getId().equals(availabilityId))
                .anyMatch(existing -> request.startTime().isBefore(existing.getEndTime())
                        && existing.getStartTime().isBefore(request.endTime()));
        if (overlaps) throw new IllegalArgumentException("This availability overlaps an existing schedule for that weekday");
        availability.setDayOfWeek(request.dayOfWeek());
        availability.setStartTime(request.startTime());
        availability.setEndTime(request.endTime());
        availability.setSlotDurationMinutes(request.slotDurationMinutes());
        Availability saved = availabilityRepository.save(availability);
        scheduleConflictService.refresh(availability.getDoctor());
        return toResponse(saved);
    }

    private void validateWindow(AvailabilityRequest request) {
        if (!request.startTime().isBefore(request.endTime()))
            throw new IllegalArgumentException("Start time must be before end time");
        if (request.endTime().minusMinutes(request.slotDurationMinutes()).isBefore(request.startTime()))
            throw new IllegalArgumentException("Availability window is too short for the selected slot duration");
    }

    @Transactional
    public void delete(Long id) {

        Availability availability = availabilityRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Availability not found"));
        Doctor doctor = doctorRepository.findByIdForUpdate(availability.getDoctor().getId())
                .orElseThrow(() -> new DoctorNotFoundException("Doctor not found"));
        availability = availabilityRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Availability not found"));
        doctor.getAvailabilities().removeIf(existing -> existing.getId().equals(id));
        scheduleConflictService.refresh(doctor);
    }

    @Transactional
    public AvailabilityResponse createForDoctor(String email, Long doctorId, AvailabilityRequest request) {
        assertOwnDoctor(email, doctorId);
        return create(doctorId, request);
    }

    @Transactional
    public void deleteForDoctor(String email, Long doctorId, Long availabilityId) {
        assertOwnDoctor(email, doctorId);
        Doctor doctor = doctorRepository.findByIdForUpdate(doctorId)
                .orElseThrow(() -> new DoctorNotFoundException("Doctor not found with id " + doctorId));
        Availability availability = availabilityRepository.findById(availabilityId)
                .orElseThrow(() -> new IllegalArgumentException("Availability not found"));
        if (!availability.getDoctor().getId().equals(doctorId)) throw new IllegalArgumentException("Schedule does not belong to this doctor");
        doctor.getAvailabilities().removeIf(existing -> existing.getId().equals(availabilityId));
        scheduleConflictService.refresh(doctor);
    }

    private void assertOwnDoctor(String email, Long doctorId) {
        User user = userRepository.findByEmail(email).orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (user.getRole() == Role.ADMIN) return;
        Doctor doctor = doctorRepository.findByUserId(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Doctor profile not found"));
        if (!doctor.getId().equals(doctorId)) throw new IllegalArgumentException("You can only manage your own schedule");
    }

    private AvailabilityResponse toResponse(
            Availability availability) {

        return new AvailabilityResponse(
                availability.getId(),
                availability.getDoctor().getId(),
                availability.getDayOfWeek(),
                availability.getStartTime(),
                availability.getEndTime(),
                availability.getSlotDurationMinutes()
        );
    }
}
