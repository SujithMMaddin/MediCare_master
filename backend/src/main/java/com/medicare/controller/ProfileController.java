package com.medicare.controller;

import com.medicare.dto.ChangePasswordRequest;
import com.medicare.dto.ProfileResponse;
import com.medicare.dto.ProfileUpdateRequest;
import com.medicare.dto.ProfileUpdateResponse;
import com.medicare.dto.DoctorProfileUpdateRequest;
import com.medicare.service.ProfileService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping
    public ResponseEntity<ProfileResponse> getProfile(Authentication authentication) {
        return ResponseEntity.ok(profileService.getProfile(authentication.getName()));
    }

    @PostMapping("/photo")
    public ResponseEntity<ProfileResponse> uploadPhoto(Authentication authentication,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(profileService.uploadPhoto(authentication.getName(), file));
    }

    @PutMapping
    public ResponseEntity<ProfileUpdateResponse> updateProfile(
            Authentication authentication,
            @Valid @RequestBody ProfileUpdateRequest request) {
        return ResponseEntity.ok(profileService.updateProfile(authentication.getName(), request));
    }

    @PutMapping("/password")
    public ResponseEntity<Void> changePassword(
            Authentication authentication,
            @Valid @RequestBody ChangePasswordRequest request) {
        profileService.changePassword(authentication.getName(), request);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/doctor-details")
    public ResponseEntity<ProfileResponse> updateDoctorDetails(Authentication authentication,
            @Valid @RequestBody DoctorProfileUpdateRequest request) {
        return ResponseEntity.ok(profileService.updateDoctorDetails(authentication.getName(), request));
    }
}
