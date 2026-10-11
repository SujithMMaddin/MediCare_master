package com.medicare.service;

import com.medicare.dto.AppointmentRequest;
import com.medicare.dto.AvailableSlotResponse;
import com.medicare.entity.*;
import com.medicare.exception.InvalidAppointmentException;
import com.medicare.exception.UnauthorizedAccessException;
import com.medicare.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AppointmentServiceTest {
    private AppointmentRepository appointments;
    private UserRepository users;
    private DoctorRepository doctors;
    private PatientProfileRepository profiles;
    private BookingRateLimiter limiter;
    private BillingService billingService;
    private DoctorLeaveRepository leaves;
    private NotificationService notifications;
    private AppointmentService service;

    @BeforeEach
    void setUp() {
        appointments = mock(AppointmentRepository.class);
        users = mock(UserRepository.class);
        doctors = mock(DoctorRepository.class);
        profiles = mock(PatientProfileRepository.class);
        limiter = mock(BookingRateLimiter.class);
        billingService = mock(BillingService.class);
        leaves = mock(DoctorLeaveRepository.class);
        notifications = mock(NotificationService.class);
        service = new AppointmentService(appointments, users, doctors, profiles, limiter, billingService, leaves, notifications, 3);
    }

    @Test
    void activeAccountLimitBlocksBookingAndCountsOnlyPendingAndConfirmed() {
        User account = mock(User.class);
        when(account.getId()).thenReturn(14L);
        when(users.findByEmail("patient@example.test")).thenReturn(Optional.of(account));
        when(users.findByIdForUpdate(14L)).thenReturn(Optional.of(account));
        when(appointments.countByBookedByIdAndStatusInAndAppointmentDateAfter(eq(14L), anyList(), any()))
                .thenReturn(3L);

        AppointmentRequest request = new AppointmentRequest(2L, 7L, 5L,
                LocalDateTime.now().plusDays(2), "checkup");
        assertThrows(InvalidAppointmentException.class, () -> service.bookAppointment("patient@example.test", request));

        verify(appointments).countByBookedByIdAndStatusInAndAppointmentDateAfter(
                eq(14L), eq(List.of(AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED)), any());
        verifyNoInteractions(profiles, doctors);
    }

    @Test
    void patientAppointmentListIsScopedToAuthenticatedBookingAccount() {
        User account=mock(User.class);when(account.getId()).thenReturn(14L);
        when(users.findByEmail("patient@example.test")).thenReturn(Optional.of(account));
        when(appointments.findByBookedByIdOrderByAppointmentDateDesc(14L)).thenReturn(List.of());
        assertTrue(service.getMyAppointments("patient@example.test").isEmpty());
        verify(appointments).findByBookedByIdOrderByAppointmentDateDesc(14L);
        verify(appointments,never()).findAllByOrderByAppointmentDateDesc();
    }

    @Test
    void doctorAppointmentListIsScopedToAuthenticatedDoctorProfile() {
        User account=mock(User.class);Doctor doctor=mock(Doctor.class);when(account.getDoctor()).thenReturn(doctor);
        when(users.findByEmail("doctor@example.test")).thenReturn(Optional.of(account));when(doctor.getId()).thenReturn(22L);
        when(doctors.findById(22L)).thenReturn(Optional.of(doctor));
        when(appointments.findByDoctorIdOrderByAppointmentDateDesc(22L)).thenReturn(List.of());
        assertTrue(service.getDoctorAppointments("doctor@example.test").isEmpty());
        verify(appointments).findByDoctorIdOrderByAppointmentDateDesc(22L);
        verify(appointments,never()).findAllByOrderByAppointmentDateDesc();
    }

    @Test
    void rejectsBeneficiaryProfileOwnedByAnotherAccount() {
        User account = mock(User.class);
        when(account.getId()).thenReturn(14L);
        when(users.findByEmail("patient@example.test")).thenReturn(Optional.of(account));
        when(users.findByIdForUpdate(14L)).thenReturn(Optional.of(account));
        when(appointments.countByBookedByIdAndStatusInAndAppointmentDateAfter(eq(14L), anyList(), any()))
                .thenReturn(0L);
        when(profiles.findByIdAndOwnerId(7L, 14L)).thenReturn(Optional.empty());

        AppointmentRequest request = new AppointmentRequest(2L, 7L, 5L,
                LocalDateTime.now().plusDays(2), null);
        assertThrows(UnauthorizedAccessException.class, () -> service.bookAppointment("patient@example.test", request));
        verifyNoInteractions(doctors);
    }

    @Test
    void rejectsOverlappingActiveAppointmentsForSamePatientAcrossDoctors() {
        User account = mock(User.class);
        when(account.getId()).thenReturn(14L);
        when(users.findByEmail("patient@example.test")).thenReturn(Optional.of(account));
        when(users.findByIdForUpdate(14L)).thenReturn(Optional.of(account));
        when(appointments.countByBookedByIdAndStatusInAndAppointmentDateAfter(eq(14L), anyList(), any()))
                .thenReturn(0L);

        PatientProfile profile = mock(PatientProfile.class);
        when(profile.getId()).thenReturn(7L);
        when(profiles.findByIdAndOwnerId(7L, 14L)).thenReturn(Optional.of(profile));

        LocalDate date = LocalDate.now().plusDays(2);
        LocalDateTime requested = LocalDateTime.of(date, LocalTime.of(10, 0));
        Doctor selected = mock(Doctor.class);
        activate(selected);
        Specialization specialty = mock(Specialization.class);
        when(specialty.getId()).thenReturn(5L);
        when(specialty.getConsultationFee()).thenReturn(new BigDecimal("500.00"));
        when(selected.getId()).thenReturn(2L);
        when(selected.getSpecialization()).thenReturn(specialty);
        Availability selectedSchedule = availability(date.getDayOfWeek(), "09:00", "12:00", 30);
        when(selected.getAvailabilities()).thenReturn(List.of(selectedSchedule));
        when(doctors.findByIdForUpdate(2L)).thenReturn(Optional.of(selected));
        when(appointments.existsByDoctorIdAndAppointmentDateAndStatusIn(eq(2L), eq(requested), anyList())).thenReturn(false);

        Doctor otherDoctor = mock(Doctor.class);
        Availability otherSchedule = availability(date.getDayOfWeek(), "10:15", "10:45", 30);
        when(otherDoctor.getAvailabilities()).thenReturn(List.of(otherSchedule));
        Appointment existing = mock(Appointment.class);
        when(existing.getDoctor()).thenReturn(otherDoctor);
        when(existing.getAppointmentDate()).thenReturn(LocalDateTime.of(date, LocalTime.of(10, 15)));
        when(appointments.findByPatientProfileIdAndStatusInAndAppointmentDateAfter(eq(7L), anyList(), any()))
                .thenReturn(List.of(existing));

        AppointmentRequest request = new AppointmentRequest(2L, 7L, 5L, requested, null);
        InvalidAppointmentException error = assertThrows(InvalidAppointmentException.class,
                () -> service.bookAppointment("patient@example.test", request));
        assertTrue(error.getMessage().contains("overlapping"));
        verify(appointments, never()).save(any());
    }

    @ParameterizedTest
    @EnumSource(value = PatientRelationship.class, names = {"SELF", "CHILD"})
    void patientCanBookForAuthorizedOwnOrFamilyProfile(PatientRelationship relationship) {
        User account = mock(User.class);
        when(account.getId()).thenReturn(14L);
        when(account.getName()).thenReturn("Account Holder");
        when(account.getEmail()).thenReturn("patient@example.test");
        when(users.findByEmail("patient@example.test")).thenReturn(Optional.of(account));
        when(users.findByIdForUpdate(14L)).thenReturn(Optional.of(account));
        when(appointments.countByBookedByIdAndStatusInAndAppointmentDateAfter(eq(14L), anyList(), any())).thenReturn(0L);

        PatientProfile family = mock(PatientProfile.class);
        when(family.getId()).thenReturn(7L);
        when(family.getFullName()).thenReturn("Taylor Patient");
        when(family.getRelationship()).thenReturn(relationship);
        when(profiles.findByIdAndOwnerId(7L, 14L)).thenReturn(Optional.of(family));

        LocalDate date = LocalDate.now().plusDays(2);
        LocalDateTime requested = LocalDateTime.of(date, LocalTime.of(10, 0));
        Doctor doctor = mock(Doctor.class);
        activate(doctor);
        Specialization specialty = mock(Specialization.class);
        User doctorUser = mock(User.class);
        when(doctorUser.isActive()).thenReturn(true);
        when(specialty.getId()).thenReturn(5L);
        when(specialty.getName()).thenReturn("Cardiology");
        when(specialty.getConsultationFee()).thenReturn(new BigDecimal("500.00"));
        when(doctor.getId()).thenReturn(2L);
        when(doctor.getSpecialization()).thenReturn(specialty);
        when(doctor.getUser()).thenReturn(doctorUser);
        when(doctorUser.getName()).thenReturn("Dr. Example");
        when(doctorUser.getEmail()).thenReturn("doctor@example.test");
        Availability schedule = availability(date.getDayOfWeek(), "09:00", "11:00", 30);
        when(doctor.getAvailabilities()).thenReturn(List.of(schedule));
        when(doctors.findByIdForUpdate(2L)).thenReturn(Optional.of(doctor));
        when(appointments.existsByDoctorIdAndAppointmentDateAndStatusIn(eq(2L), eq(requested), anyList())).thenReturn(false);
        when(appointments.findByPatientProfileIdAndStatusInAndAppointmentDateAfter(eq(7L), anyList(), any())).thenReturn(List.of());
        when(appointments.save(any(Appointment.class))).thenAnswer(call -> call.getArgument(0));

        AppointmentRequest request = new AppointmentRequest(2L, 7L, 5L, requested, "Annual checkup");
        var response = service.bookAppointment("patient@example.test", request);

        assertEquals("Taylor Patient", response.patientName());
        assertEquals(relationship.name(), response.patientRelationship());
        assertEquals("Account Holder", response.bookingAccountName());
        assertEquals("Dr. Example", response.doctorName());
        assertEquals(new BigDecimal("500.00"), response.consultationFee());
        assertEquals(new BigDecimal("500.00"), response.totalAmount());
        assertEquals(PaymentStatus.PENDING, response.paymentStatus());
        verify(billingService).createForAppointment(any(Appointment.class), eq(new BigDecimal("500.00")));
    }

    @Test
    void availabilityRangeIncludesDatesAcrossMonthBoundary() {
        Doctor doctor = mock(Doctor.class);
        activate(doctor);
        when(doctors.findById(2L)).thenReturn(Optional.of(doctor));
        LocalDate today = LocalDate.now();
        LocalDate nextMonth = today.withDayOfMonth(1).plusMonths(1);
        Availability schedule = availability(nextMonth.getDayOfWeek(), "09:00", "10:00", 30);
        when(doctor.getAvailabilities()).thenReturn(List.of(schedule));
        when(appointments.findOccupiedAppointmentDates(eq(2L), any(), any(), anyList())).thenReturn(List.of());

        List<AvailableSlotResponse> slots = service.getAvailableSlots(2L, today, nextMonth);
        assertTrue(slots.stream().anyMatch(slot -> slot.date().equals(nextMonth)));
    }

    @Test
    void fullyBookedDateReturnsNoAvailability() {
        Doctor doctor = mock(Doctor.class);
        activate(doctor);
        when(doctors.findById(2L)).thenReturn(Optional.of(doctor));
        LocalDate date = LocalDate.now().plusDays(3);
        Availability schedule = availability(date.getDayOfWeek(), "10:00", "11:00", 30);
        when(doctor.getAvailabilities()).thenReturn(List.of(schedule));
        when(appointments.findOccupiedAppointmentDates(eq(2L), any(), any(), anyList()))
                .thenReturn(List.of(date.atTime(10, 0), date.atTime(10, 30)));

        assertTrue(service.getAvailableSlots(2L, date, date).isEmpty());
    }

    private Availability availability(DayOfWeek day, String start, String end, int duration) {
        Availability value = mock(Availability.class);
        when(value.isActive()).thenReturn(true);
        when(value.getDayOfWeek()).thenReturn(day);
        when(value.getStartTime()).thenReturn(LocalTime.parse(start));
        when(value.getEndTime()).thenReturn(LocalTime.parse(end));
        when(value.getSlotDurationMinutes()).thenReturn(duration);
        return value;
    }

    private void activate(Doctor doctor) {
        User user = mock(User.class);
        when(user.isActive()).thenReturn(true);
        when(doctor.getUser()).thenReturn(user);
        when(doctor.isActive()).thenReturn(true);
    }
}
