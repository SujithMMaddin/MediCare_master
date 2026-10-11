package com.medicare.controller;

import com.medicare.dto.AdminReportResponse;
import com.medicare.service.AdminReportService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/reports")
public class AdminReportController {
    private final AdminReportService service;
    public AdminReportController(AdminReportService service) { this.service=service; }
    @GetMapping public AdminReportResponse summary(Authentication auth) { return service.summary(auth.getName()); }
}
