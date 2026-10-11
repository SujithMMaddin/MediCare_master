package com.medicare.controller;

import com.medicare.dto.DoctorLeaveRequest;
import com.medicare.dto.DoctorLeaveResponse;
import com.medicare.dto.DoctorLeaveDecision;
import com.medicare.service.DoctorLeaveService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/doctor/leaves")
public class DoctorLeaveController {
    private final DoctorLeaveService service;
    public DoctorLeaveController(DoctorLeaveService service) { this.service = service; }
    @GetMapping public List<DoctorLeaveResponse> mine(Authentication auth) { return service.mine(auth.getName()); }
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public DoctorLeaveResponse create(Authentication auth, @Valid @RequestBody DoctorLeaveRequest request) {
        return service.create(auth.getName(), request);
    }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Authentication auth, @PathVariable Long id) { service.delete(auth.getName(), id); }

    @GetMapping("/admin")
    public List<DoctorLeaveResponse> all() { return service.all(); }

    @DeleteMapping("/admin/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeAsAdmin(@PathVariable Long id) { service.removeAsAdmin(id); }

    @PutMapping("/{id}/decision")
    public DoctorLeaveResponse decide(@PathVariable Long id, @Valid @RequestBody DoctorLeaveDecision decision) {
        return service.decide(id, decision);
    }
}
