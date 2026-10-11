package com.medicare.service;

import com.medicare.dto.PatientProfileRequest;
import com.medicare.dto.PatientProfileResponse;
import com.medicare.entity.PatientProfile;
import com.medicare.entity.PatientRelationship;
import com.medicare.entity.Role;
import com.medicare.entity.User;
import com.medicare.exception.InvalidAppointmentException;
import com.medicare.repository.PatientProfileRepository;
import com.medicare.repository.AppointmentRepository;
import com.medicare.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
public class PatientProfileService {
    private final PatientProfileRepository profiles;
    private final UserRepository users;
    private final AppointmentRepository appointments;

    public PatientProfileService(PatientProfileRepository profiles, UserRepository users, AppointmentRepository appointments) {
        this.profiles = profiles;
        this.users = users;
        this.appointments = appointments;
    }

    @Transactional
    public List<PatientProfileResponse> getMine(String email) {
        User account = requirePatient(email);
        account = users.findByIdForUpdate(account.getId()).orElseThrow();
        ensureSelfProfile(account);
        PatientProfile self = profiles.findByOwnerIdAndSelfTrue(account.getId()).orElseThrow();
        appointments.assignLegacyAppointmentsToSelf(account.getId(), self.getId());
        return profiles.findByOwnerIdOrderBySelfDescFullNameAsc(account.getId())
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public PatientProfileResponse addBeneficiary(String email, PatientProfileRequest request) {
        User account = requirePatient(email);
        account = users.findByIdForUpdate(account.getId()).orElseThrow();
        if (request.relationship() == PatientRelationship.SELF) {
            throw new InvalidAppointmentException("Choose Parent, Spouse, Child, or Other for a family profile");
        }
        PatientProfile profile = new PatientProfile(account, request.fullName().trim(),
                request.dateOfBirth(), request.relationship(), false, UUID.randomUUID().toString());
        return toResponse(profiles.save(profile));
    }

    private User requirePatient(String email) {
        User user = users.findByEmail(email)
                .orElseThrow(() -> new InvalidAppointmentException("Booking account was not found"));
        if (user.getRole() != Role.PATIENT) {
            throw new InvalidAppointmentException("Only patient accounts can manage patient profiles");
        }
        return user;
    }

    private void ensureSelfProfile(User account) {
        if (profiles.findByOwnerIdAndSelfTrue(account.getId()).isEmpty()) {
            profiles.save(new PatientProfile(account, account.getName(), null,
                    PatientRelationship.SELF, true, "SELF"));
        }
    }

    private PatientProfileResponse toResponse(PatientProfile p) {
        return new PatientProfileResponse(p.getId(), p.getFullName(), p.getDateOfBirth(), p.getRelationship(), p.isSelf());
    }
}
