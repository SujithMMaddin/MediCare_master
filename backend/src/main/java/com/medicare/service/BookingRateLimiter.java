package com.medicare.service;

import com.medicare.exception.BookingRateLimitException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.time.Clock;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;

/** Local, per-process cooldown suitable for this single-instance project. */
@Component
public class BookingRateLimiter {
    private final ConcurrentHashMap<Long, Long> lastRequestAt = new ConcurrentHashMap<>();
    private final long cooldownMillis;
    private final Clock clock = Clock.systemUTC();

    public BookingRateLimiter(@Value("${medicare.booking.cooldown-seconds:10}") long cooldownSeconds) {
        this.cooldownMillis = Math.max(0, cooldownSeconds) * 1000L;
    }

    public void checkAndRecord(Long accountId) {
        long now = clock.millis();
        AtomicBoolean limited = new AtomicBoolean(false);
        lastRequestAt.compute(accountId, (id, previous) -> {
            if (previous != null && now - previous < cooldownMillis) {
                limited.set(true);
                return previous;
            }
            return now;
        });
        if (limited.get()) {
            throw new BookingRateLimitException("Please wait before submitting another appointment request.");
        }
    }
}
