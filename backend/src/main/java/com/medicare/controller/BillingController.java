package com.medicare.controller;

import com.medicare.dto.BillingResponse;
import com.medicare.dto.BillingStatusRequest;
import com.medicare.service.BillingService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/billing")
public class BillingController {

    private final BillingService billingService;

    public BillingController(BillingService billingService) {
        this.billingService = billingService;
    }

    @GetMapping
    public ResponseEntity<List<BillingResponse>> getAll() {
        return ResponseEntity.ok(billingService.getAll());
    }

    @PutMapping("/appointments/{appointmentId}/status")
    public ResponseEntity<BillingResponse> updateStatus(
            @PathVariable Long appointmentId,
            @Valid @RequestBody BillingStatusRequest request) {
        return ResponseEntity.ok(billingService.updateStatus(appointmentId, request.status()));
    }
}
