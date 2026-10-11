package com.medicare.service;

import com.medicare.dto.FeeChangeDecision;
import com.medicare.entity.*;
import com.medicare.repository.*;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class FeeChangeRequestServiceTest {
    @Test
    void approvedDoctorRequestUpdatesIndividualFeeAndSendsDecisionNotification() {
        User user = new User("Dr. Example", "doctor@example.test", "encoded", Role.DOCTOR);
        user.setId(7L);
        Specialization specialty = new Specialization("Cardiology");
        specialty.setConsultationFee(new BigDecimal("500.00"));
        Doctor doctor = new Doctor(user, specialty);
        doctor.setId(2L);
        FeeChangeRequest request = new FeeChangeRequest(doctor, new BigDecimal("650.00"), "New consultation hours");

        UserRepository users = mock(UserRepository.class);
        DoctorRepository doctors = mock(DoctorRepository.class);
        FeeChangeRequestRepository requests = mock(FeeChangeRequestRepository.class);
        NotificationService notifications = mock(NotificationService.class);
        when(requests.findById(11L)).thenReturn(Optional.of(request));
        when(requests.save(any(FeeChangeRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));
        FeeChangeRequestService service = new FeeChangeRequestService(users, doctors, requests, notifications);

        var result = service.decide(11L, new FeeChangeDecision(FeeRequestStatus.APPROVED, null));

        assertEquals(FeeRequestStatus.APPROVED, result.status());
        assertEquals(new BigDecimal("650.00"), doctor.getConsultationFee());
        assertEquals("Dr. Example", result.doctorName());
        verify(notifications).notifyUser(user, "FEE_REQUEST_DECISION",
                "Your consultation fee request was approved.", null);
    }

    @Test
    void rejectsPendingRequestWithoutAdminExplanation() {
        FeeChangeRequest request = new FeeChangeRequest(mock(Doctor.class), new BigDecimal("650.00"), "Reason");
        FeeChangeRequestRepository requests = mock(FeeChangeRequestRepository.class);
        when(requests.findById(11L)).thenReturn(Optional.of(request));
        FeeChangeRequestService service = new FeeChangeRequestService(
                mock(UserRepository.class), mock(DoctorRepository.class), requests, mock(NotificationService.class));

        assertThrows(IllegalArgumentException.class,
                () -> service.decide(11L, new FeeChangeDecision(FeeRequestStatus.REJECTED, " ")));
        assertEquals(FeeRequestStatus.PENDING, request.getStatus());
        verify(requests, never()).save(any());
    }
}
