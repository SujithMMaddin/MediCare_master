package com.medicare.controller;

import com.medicare.dto.ReviewRequest;
import com.medicare.dto.ReviewResponse;
import com.medicare.service.ReviewService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api")
public class ReviewController {
    private final ReviewService service;
    public ReviewController(ReviewService service) { this.service=service; }
    @PostMapping("/appointments/{appointmentId}/reviews") @ResponseStatus(HttpStatus.CREATED)
    public ReviewResponse create(Authentication auth, @PathVariable Long appointmentId, @Valid @RequestBody ReviewRequest request) {
        return service.create(auth.getName(), appointmentId, request);
    }
    @GetMapping("/doctors/{doctorId}/reviews")
    public List<ReviewResponse> forDoctor(@PathVariable Long doctorId) { return service.forDoctor(doctorId); }
    @GetMapping("/reviews/admin") public List<ReviewResponse> all() { return service.allForAdmin(); }
    @GetMapping("/reviews/my") public List<ReviewResponse> mine(Authentication auth) { return service.mine(auth.getName()); }
    @PutMapping("/reviews/admin/{id}")
    public ReviewResponse moderate(@PathVariable Long id, @RequestBody ModerationRequest request) {
        return service.moderate(id, request.approved());
    }
    @DeleteMapping("/reviews/admin/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) { service.delete(id); }
    public record ModerationRequest(boolean approved) {}
}
