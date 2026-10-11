package com.medicare.controller;

import com.medicare.dto.NotificationResponse;
import com.medicare.service.NotificationService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationService service;
    public NotificationController(NotificationService service) { this.service = service; }
    @GetMapping public List<NotificationResponse> mine(Authentication auth) { return service.mine(auth.getName()); }
    @GetMapping("/unread-count") public long unread(Authentication auth) { return service.unreadCount(auth.getName()); }
    @PutMapping("/{id}/read") public NotificationResponse read(Authentication auth, @PathVariable Long id) {
        return service.markRead(auth.getName(), id);
    }
}
