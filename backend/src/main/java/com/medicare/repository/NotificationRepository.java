package com.medicare.repository;

import com.medicare.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findTop100ByUserIdOrderByCreatedAtDesc(Long userId);
    boolean existsByUserIdAndTypeAndReferenceId(Long userId, String type, Long referenceId);
    long countByUserIdAndReadAtIsNull(Long userId);
}
