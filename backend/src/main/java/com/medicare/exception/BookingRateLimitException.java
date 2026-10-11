package com.medicare.exception;

public class BookingRateLimitException extends RuntimeException {
    public BookingRateLimitException(String message) { super(message); }
}
