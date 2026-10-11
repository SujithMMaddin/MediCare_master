package com.medicare.dto;

import java.time.LocalDateTime;

public record NotificationResponse(Long id, String type, String message, Long referenceId, LocalDateTime createdAt, LocalDateTime readAt) {}
