package com.medicare.controller;

import com.medicare.dto.*;
import com.medicare.service.FeeChangeRequestService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/fee-change-requests")
public class FeeChangeRequestController {
    private final FeeChangeRequestService service;
    public FeeChangeRequestController(FeeChangeRequestService service) { this.service=service; }
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public FeeChangeRequestResponse create(Authentication auth, @Valid @RequestBody FeeChangeRequestCreate request) { return service.create(auth.getName(), request); }
    @GetMapping("/my") public List<FeeChangeRequestResponse> mine(Authentication auth) { return service.mine(auth.getName()); }
    @GetMapping public List<FeeChangeRequestResponse> all() { return service.all(); }
    @PutMapping("/{id}") public FeeChangeRequestResponse decide(@PathVariable Long id, @Valid @RequestBody FeeChangeDecision decision) { return service.decide(id, decision); }
}
