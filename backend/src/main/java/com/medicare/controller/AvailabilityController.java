package com.medicare.controller;

import com.medicare.dto.AvailabilityRequest;
import com.medicare.dto.AvailabilityResponse;
import com.medicare.service.AvailabilityService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;

import java.util.List;

@RestController
@RequestMapping("/api/doctors/{doctorId}/availability")
public class AvailabilityController {

    private final AvailabilityService availabilityService;

    public AvailabilityController(
            AvailabilityService availabilityService) {

        this.availabilityService = availabilityService;
    }

    @PostMapping
    public ResponseEntity<AvailabilityResponse> create(
            @PathVariable Long doctorId,
            Authentication authentication,
            @Valid @RequestBody AvailabilityRequest request) {

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(availabilityService.createForDoctor(authentication.getName(), doctorId, request));
    }

    @GetMapping
    public ResponseEntity<List<AvailabilityResponse>> getForDoctor(
            @PathVariable Long doctorId) {

        return ResponseEntity.ok(
                availabilityService.getForDoctor(doctorId));
    }

    @PutMapping("/{availabilityId}")
    public ResponseEntity<AvailabilityResponse> update(@PathVariable Long doctorId,
            @PathVariable Long availabilityId, Authentication authentication,
            @Valid @RequestBody AvailabilityRequest request) {
        return ResponseEntity.ok(availabilityService.updateForDoctor(authentication.getName(), doctorId, availabilityId, request));
    }

    @DeleteMapping("/{availabilityId}")
    public ResponseEntity<Void> delete(
            @PathVariable Long doctorId,
            @PathVariable Long availabilityId,
            Authentication authentication) {

        availabilityService.deleteForDoctor(authentication.getName(), doctorId, availabilityId);

        return ResponseEntity.noContent().build();
    }
}