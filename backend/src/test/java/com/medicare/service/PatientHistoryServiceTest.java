package com.medicare.service;

import com.medicare.entity.Role;
import com.medicare.entity.User;
import com.medicare.repository.PatientHistoryRepository;
import com.medicare.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageRequest;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PatientHistoryServiceTest {
    @Test void adminSearchUsesAllProfilesAndDoesNotNeedPatientId() {
        var rows=mock(PatientHistoryRepository.class); var users=mock(UserRepository.class);
        when(users.findByEmail("admin@example.test")).thenReturn(Optional.of(new User("Admin","admin@example.test","hash",Role.ADMIN)));
        var service=new PatientHistoryService(rows,users);
        service.search("admin@example.test","Lee",null,null,null,null,PageRequest.of(0,20));
        verify(rows).search(true,"admin@example.test","Lee",null,null,null,null,PageRequest.of(0,20));
    }
    @Test void doctorSearchUsesAuthenticatedEmailAndCompletedTreatedPatientScope() {
        var rows=mock(PatientHistoryRepository.class); var users=mock(UserRepository.class);
        var doctor=new User("Dr A","doctor@example.test","hash",Role.DOCTOR);
        when(users.findByEmail("doctor@example.test")).thenReturn(Optional.of(doctor));
        var service=new PatientHistoryService(rows,users);
        service.search("doctor@example.test",null,999L,"COMPLETED",null,null, PageRequest.of(0,20));
        verify(rows).search(false,"doctor@example.test",null,999L,"COMPLETED",null,null,PageRequest.of(0,20));
    }

    @Test void rejectsPatientHistoryForPatientRole() {
        var rows=mock(PatientHistoryRepository.class); var users=mock(UserRepository.class);
        when(users.findByEmail("patient@example.test")).thenReturn(Optional.of(new User("P","patient@example.test","hash",Role.PATIENT)));
        var service=new PatientHistoryService(rows,users);
        assertThrows(RuntimeException.class,()->service.search("patient@example.test",null,null,null,null,null,PageRequest.of(0,20)));
        verifyNoInteractions(rows);
    }
}
