package com.medicare.service;

import com.medicare.dto.*;
import com.medicare.entity.Doctor;
import com.medicare.entity.User;
import com.medicare.exception.InvalidCredentialsException;
import com.medicare.exception.UserAlreadyExistsException;
import com.medicare.exception.UserNotFoundException;
import com.medicare.repository.DoctorRepository;
import com.medicare.repository.UserRepository;
import com.medicare.repository.DoctorReviewRepository;
import com.medicare.security.CustomUserDetailsService;
import com.medicare.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import java.util.List;

@Service
public class ProfileService {

    private final UserRepository userRepository;
    private final DoctorRepository doctorRepository;
    private final AvailabilityService availabilityService;
    private final PasswordEncoder passwordEncoder;
    private final CustomUserDetailsService userDetailsService;
    private final JwtService jwtService;
    private final DoctorReviewRepository reviews;
    @org.springframework.beans.factory.annotation.Value("${app.profile-photo-directory:${user.dir}/uploads/profile-photos}")
    private String profilePhotoDirectory;

    public ProfileService(
            UserRepository userRepository,
            DoctorRepository doctorRepository,
            AvailabilityService availabilityService,
            PasswordEncoder passwordEncoder,
            CustomUserDetailsService userDetailsService,
            JwtService jwtService,
            DoctorReviewRepository reviews) {
        this.userRepository = userRepository;
        this.doctorRepository = doctorRepository;
        this.availabilityService = availabilityService;
        this.passwordEncoder = passwordEncoder;
        this.userDetailsService = userDetailsService;
        this.jwtService = jwtService;
        this.reviews = reviews;
    }

    @Transactional
    public ProfileResponse updateDoctorDetails(String email, DoctorProfileUpdateRequest request) {
        User user = findUser(email);
        if (user.getRole() != com.medicare.entity.Role.DOCTOR) throw new IllegalArgumentException("Only doctors can update practice details");
        Doctor doctor = doctorRepository.findByUserId(user.getId())
                .orElseThrow(() -> new UserNotFoundException("Doctor profile not found"));
        doctor.setBio(clean(request.bio()));
        doctor.setQualifications(clean(request.qualifications()));
        doctor.setExperienceYears(request.experienceYears());
        doctor.setPhone(clean(request.phone()));
        doctorRepository.save(doctor);
        return toResponse(user);
    }

    @Transactional(readOnly = true)
    public ProfileResponse getProfile(String email) {
        return toResponse(findUser(email));
    }

    @Transactional
    public ProfileUpdateResponse updateProfile(String currentEmail, ProfileUpdateRequest request) {
        User user = findUser(currentEmail);
        String email = request.email().trim().toLowerCase();
        if (!user.getEmail().equalsIgnoreCase(email) && userRepository.existsByEmail(email)) {
            throw new UserAlreadyExistsException("A user with email " + email + " already exists");
        }

        user.setName(request.name().trim());
        user.setEmail(email);
        if (request.profilePhotoUrl() != null) {
            user.setProfilePhotoUrl(request.profilePhotoUrl().isBlank() ? null : request.profilePhotoUrl().trim());
        }
        user = userRepository.save(user);

        String token = jwtService.generateToken(userDetailsService.loadUserByUsername(user.getEmail()));
        LoginResponse session = new LoginResponse(token, "Bearer", user.getId(), user.getName(),
                user.getEmail(), user.getRole(), user.getProfilePhotoUrl());
        return new ProfileUpdateResponse(toResponse(user), session);
    }

    @Transactional
    public ProfileResponse uploadPhoto(String email, MultipartFile file) {
        if (file == null || file.isEmpty() || file.getSize() > 5 * 1024 * 1024) {
            throw new IllegalArgumentException("Choose an image file no larger than 5 MB");
        }
        try {
            byte[] bytes = file.getBytes();
            String extension = imageExtension(bytes);
            Path directory = Path.of(profilePhotoDirectory).toAbsolutePath().normalize();
            Files.createDirectories(directory);
            String filename = UUID.randomUUID() + extension;
            Path target = directory.resolve(filename).normalize();
            if (!target.getParent().equals(directory)) {
                throw new IllegalArgumentException("Invalid profile photo");
            }
            Files.write(target, bytes);

            User user = findUser(email);
            user.setProfilePhotoUrl("/uploads/profile-photos/" + filename);
            return toResponse(userRepository.save(user));
        } catch (IOException exception) {
            throw new IllegalStateException("Could not save profile photo", exception);
        }
    }

    private String imageExtension(byte[] bytes) {
        if (bytes.length >= 8 && (bytes[0] & 0xff) == 0x89 && bytes[1] == 0x50
                && bytes[2] == 0x4e && bytes[3] == 0x47) return ".png";
        if (bytes.length >= 3 && (bytes[0] & 0xff) == 0xff && (bytes[1] & 0xff) == 0xd8
                && (bytes[2] & 0xff) == 0xff) return ".jpg";
        if (bytes.length >= 6 && bytes[0] == 'G' && bytes[1] == 'I' && bytes[2] == 'F'
                && bytes[3] == '8' && (bytes[4] == '7' || bytes[4] == '9') && bytes[5] == 'a') return ".gif";
        if (bytes.length >= 12 && bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F'
                && bytes[3] == 'F' && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B'
                && bytes[11] == 'P') return ".webp";
        throw new IllegalArgumentException("Upload a valid PNG, JPEG, GIF, or WebP image");
    }

    @Transactional
    public void changePassword(String email, ChangePasswordRequest request) {
        User user = findUser(email);
        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw new InvalidCredentialsException("Current password is incorrect");
        }
        if (passwordEncoder.matches(request.newPassword(), user.getPassword())) {
            throw new IllegalArgumentException("New password must be different from the current password");
        }
        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }

    private ProfileResponse toResponse(User user) {
        Doctor doctor = doctorRepository.findByUserId(user.getId()).orElse(null);
        if (doctor == null) {
            return new ProfileResponse(user.getId(), user.getName(), user.getEmail(),
                    user.getProfilePhotoUrl(), user.getRole(), null, null, null, List.of(), null, null, null, null, user.isActive(), null, 0);
        }
        return new ProfileResponse(user.getId(), user.getName(), user.getEmail(),
                user.getProfilePhotoUrl(), user.getRole(), doctor.getId(),
                doctor.getSpecialization().getName(),
                doctor.getConsultationFee() == null
                        ? doctor.getSpecialization().getConsultationFee()
                        : doctor.getConsultationFee(),
                availabilityService.getForDoctor(doctor.getId()), doctor.getBio(), doctor.getQualifications(),
                doctor.getExperienceYears(), doctor.getPhone(), doctor.isActive() && user.isActive(),
                reviews.averageRating(doctor.getId()), reviews.countApprovedByDoctorId(doctor.getId()));
    }

    private String clean(String value) { return value == null || value.isBlank() ? null : value.trim(); }

    private User findUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("User not found"));
    }
}
