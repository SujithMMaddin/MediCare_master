package com.medicare.repository;

import jakarta.persistence.LockModeType;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.Lock;
import java.lang.reflect.Method;
import static org.junit.jupiter.api.Assertions.assertEquals;

class BookingLockConfigurationTest {
    @Test
    void serializesBookingsOnBothAccountAndDoctorRows() throws Exception {
        Method accountLock = UserRepository.class.getMethod("findByIdForUpdate", Long.class);
        Method doctorLock = DoctorRepository.class.getMethod("findByIdForUpdate", Long.class);
        assertEquals(LockModeType.PESSIMISTIC_WRITE, accountLock.getAnnotation(Lock.class).value());
        assertEquals(LockModeType.PESSIMISTIC_WRITE, doctorLock.getAnnotation(Lock.class).value());
    }
}
