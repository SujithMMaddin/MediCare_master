package com.medicare.service;

import com.medicare.exception.BookingRateLimitException;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertThrows;

class BookingRateLimiterTest {
    @Test
    void appliesCooldownPerAccount() {
        BookingRateLimiter limiter = new BookingRateLimiter(60);
        limiter.checkAndRecord(1L);
        assertThrows(BookingRateLimitException.class, () -> limiter.checkAndRecord(1L));
        limiter.checkAndRecord(2L);
    }
}
