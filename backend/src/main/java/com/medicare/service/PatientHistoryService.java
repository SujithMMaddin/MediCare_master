package com.medicare.service;
import com.medicare.entity.Role;
import com.medicare.exception.UnauthorizedAccessException;
import com.medicare.repository.PatientHistoryRepository;
import com.medicare.repository.UserRepository;
import com.medicare.dto.PatientHistoryResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
@Service
public class PatientHistoryService {
    private final PatientHistoryRepository histories; private final UserRepository users;
    public PatientHistoryService(PatientHistoryRepository histories,UserRepository users){this.histories=histories;this.users=users;}
    @Transactional(readOnly=true)
    public Page<PatientHistoryResponse> search(String email,String name,Long doctorId,String status,LocalDate from,LocalDate to,Pageable pageable){
        var user=users.findByEmail(email).orElseThrow(()->new UnauthorizedAccessException("Account not found"));
        if(from!=null&&to!=null&&from.isAfter(to))throw new IllegalArgumentException("Start date must be on or before end date");
        if(user.getRole()!=Role.ADMIN&&user.getRole()!=Role.DOCTOR)throw new UnauthorizedAccessException("Patient history is available to doctors and administrators");
        String normalized=status==null||status.isBlank()?null:status.trim().toUpperCase();
        if(normalized!=null)try{com.medicare.entity.AppointmentStatus.valueOf(normalized);}catch(IllegalArgumentException ex){throw new IllegalArgumentException("Unknown appointment status");}
        Pageable bounded=PageRequest.of(pageable.getPageNumber(),Math.min(pageable.getPageSize(),100),pageable.getSort());
        return histories.search(user.getRole()==Role.ADMIN,email,name==null||name.isBlank()?null:name.trim(),doctorId,normalized,
            from==null?null:from.atStartOfDay(),to==null?null:to.plusDays(1).atStartOfDay(),bounded);
    }
}
