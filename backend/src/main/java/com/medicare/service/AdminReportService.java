package com.medicare.service;

import com.medicare.dto.AdminReportResponse;
import com.medicare.entity.*;
import com.medicare.repository.*;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class AdminReportService {
    private static final List<AppointmentStatus> ACTIVE = List.of(AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED);
    private final DoctorRepository doctors;
    private final UserRepository users;
    private final AppointmentRepository appointments;
    private final AvailabilityRepository availabilities;
    private final FeeChangeRequestRepository feeRequests;
    private final DoctorReviewRepository reviews;
    private final BillingRecordRepository billing;
    private final NotificationRepository notifications;
    public AdminReportService(DoctorRepository doctors, UserRepository users, AppointmentRepository appointments,
            AvailabilityRepository availabilities, FeeChangeRequestRepository feeRequests, DoctorReviewRepository reviews,
            BillingRecordRepository billing, NotificationRepository notifications) {
        this.doctors=doctors; this.users=users; this.appointments=appointments; this.availabilities=availabilities;
        this.feeRequests=feeRequests; this.reviews=reviews; this.billing=billing; this.notifications=notifications;
    }
    public AdminReportResponse summary(String adminEmail) {
        User admin = users.findByEmail(adminEmail).orElseThrow(() -> new IllegalArgumentException("Admin not found"));
        return new AdminReportResponse(doctors.count(), users.findByRole(Role.PATIENT).size(), appointments.count(),
                appointments.countUpcoming(ACTIVE, LocalDateTime.now()),
                availabilities.count(), feeRequests.countByStatus(FeeRequestStatus.PENDING),
                notifications.countByUserIdAndReadAtIsNull(admin.getId()), reviews.countByApprovedFalse(),
                billing.countByStatus(PaymentStatus.PENDING), billing.countByStatus(PaymentStatus.PAID),
                billing.countByStatus(PaymentStatus.REFUNDED), billing.sumByStatus(PaymentStatus.PAID));
    }
}
