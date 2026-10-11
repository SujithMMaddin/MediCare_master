package com.medicare.service;

import com.medicare.entity.*;
import com.medicare.exception.InvalidAppointmentException;
import com.medicare.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class NoShowWorkflowTest {
    private AppointmentRepository appointments; private UserRepository users; private NotificationService notifications;
    private AppointmentService service; private User doctorUser; private Doctor doctor; private User patient;
    private Appointment appointment; private AtomicReference<AppointmentStatus> status;

    @BeforeEach void setUp(){
        appointments=mock(AppointmentRepository.class);users=mock(UserRepository.class);notifications=mock(NotificationService.class);
        doctorUser=new User("Doctor","doctor@example.test","hash",Role.DOCTOR);Specialization specialization=new Specialization("Cardiology");specialization.setConsultationFee(new BigDecimal("500"));doctor=new Doctor(doctorUser,specialization);doctor.setId(8L);doctorUser.setDoctor(doctor);
        patient=new User("Patient","patient@example.test","hash",Role.PATIENT);patient.setId(11L);
        when(users.findByEmail("doctor@example.test")).thenReturn(Optional.of(doctorUser));
        appointment=mock(Appointment.class);when(appointment.getDoctor()).thenReturn(doctor);when(appointment.getBookedBy()).thenReturn(patient);
        status=new AtomicReference<>(AppointmentStatus.CONFIRMED);when(appointment.getStatus()).thenAnswer(call->status.get());
        doAnswer(call->{status.set(call.getArgument(0));return null;}).when(appointment).setStatus(any());
        when(appointments.findByIdForUpdate(17L)).thenReturn(Optional.of(appointment));when(appointments.save(appointment)).thenReturn(appointment);
        service=new AppointmentService(appointments,users,mock(DoctorRepository.class),mock(PatientProfileRepository.class),mock(BookingRateLimiter.class),mock(BillingService.class),mock(DoctorLeaveRepository.class),notifications,3);
    }

    @Test void rejectsNoShowBeforeGracePeriod(){
        when(appointment.getAppointmentDate()).thenReturn(LocalDateTime.now().minusMinutes(5));
        assertThrows(InvalidAppointmentException.class,()->service.markNoShow(17L,"doctor@example.test"));
        verify(appointments,never()).save(any());verifyNoInteractions(notifications);
    }

    @Test void eligibleNoShowSavesTransitionThenCreatesOneActionableNotification(){
        when(appointment.getAppointmentDate()).thenReturn(LocalDateTime.now().minusMinutes(20));
        var order=inOrder(appointments,notifications);
        assertEquals(AppointmentStatus.NO_SHOW,service.markNoShow(17L,"doctor@example.test").status());
        order.verify(appointments).save(appointment);
        order.verify(notifications).notifyUserOnce(patient,"APPOINTMENT_NO_SHOW","Your appointment was recorded as a no-show.",17L);
        assertEquals(AppointmentStatus.NO_SHOW,status.get());
        assertThrows(InvalidAppointmentException.class,()->service.markNoShow(17L,"doctor@example.test"));
        verify(notifications,times(1)).notifyUserOnce(any(),anyString(),anyString(),anyLong());
    }

    @Test void anotherDoctorsCannotMarkTheAppointmentNoShow(){
        Doctor otherDoctor=new Doctor(new User("Other","other@example.test","hash",Role.DOCTOR),doctor.getSpecialization());otherDoctor.setId(9L);
        when(appointment.getDoctor()).thenReturn(otherDoctor);
        when(appointment.getAppointmentDate()).thenReturn(LocalDateTime.now().minusHours(1));
        assertThrows(InvalidAppointmentException.class,()->service.markNoShow(17L,"doctor@example.test"));
        verify(appointments,never()).save(any());verifyNoInteractions(notifications);
    }

    @Test void cancelledRejectedAndCompletedAppointmentsCannotBecomeNoShow(){
        when(appointment.getAppointmentDate()).thenReturn(LocalDateTime.now().minusHours(1));
        for(AppointmentStatus invalid:new AppointmentStatus[]{AppointmentStatus.CANCELLED,AppointmentStatus.REJECTED,AppointmentStatus.COMPLETED}){
            status.set(invalid);
            assertThrows(InvalidAppointmentException.class,()->service.markNoShow(17L,"doctor@example.test"));
        }
        verify(appointments,never()).save(any());verifyNoInteractions(notifications);
    }
}
