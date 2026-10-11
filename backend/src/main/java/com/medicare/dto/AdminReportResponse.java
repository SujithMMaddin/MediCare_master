package com.medicare.dto;

import java.math.BigDecimal;

public record AdminReportResponse(
        long doctors, long patients, long appointments, long upcomingAppointments, long activeSchedules,
        long pendingFeeRequests, long unreadNotifications, long pendingReviews,
        long pendingPayments, long paidPayments, long refundedPayments, BigDecimal revenue
) {}
