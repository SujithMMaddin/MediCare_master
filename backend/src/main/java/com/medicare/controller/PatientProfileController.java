package com.medicare.controller;

import com.medicare.dto.PatientProfileRequest;
import com.medicare.dto.PatientProfileResponse;
import com.medicare.service.PatientProfileService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/patient-profiles")
public class PatientProfileController {
    private final PatientProfileService profiles;
    public PatientProfileController(PatientProfileService profiles) { this.profiles = profiles; }

    @GetMapping
    public List<PatientProfileResponse> getMine(Authentication authentication) {
        return profiles.getMine(authentication.getName());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PatientProfileResponse addBeneficiary(Authentication authentication,
                                                  @Valid @RequestBody PatientProfileRequest request) {
        return profiles.addBeneficiary(authentication.getName(), request);
    }
}
