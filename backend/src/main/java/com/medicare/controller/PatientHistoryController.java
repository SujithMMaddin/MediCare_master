package com.medicare.controller;
import com.medicare.dto.PatientHistoryResponse;
import com.medicare.service.PatientHistoryService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
@RestController
@RequestMapping("/api/patient-history")
public class PatientHistoryController {
    private final PatientHistoryService service;
    public PatientHistoryController(PatientHistoryService service){this.service=service;}
    @GetMapping public Page<PatientHistoryResponse> search(Authentication auth,@RequestParam(required=false) String name,
        @RequestParam(required=false) Long doctorId,@RequestParam(required=false) String status,
        @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate to,Pageable pageable){
        return service.search(auth.getName(),name,doctorId,status,from,to,pageable);
    }
}
