-- Doctor profile, status, schedules, leaves, fee requests, notifications, reviews, and reporting fields.
-- Run once after V3 against medicare_master_db when Hibernate is not managing the schema.
USE medicare_master_db;

ALTER TABLE users
    ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE doctors
    ADD COLUMN bio VARCHAR(2000) NULL,
    ADD COLUMN qualifications VARCHAR(500) NULL,
    ADD COLUMN experience_years INT NULL,
    ADD COLUMN phone VARCHAR(30) NULL,
    ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE doctor_availability
    ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE doctor_leaves (
    id BIGINT NOT NULL AUTO_INCREMENT,
    doctor_id BIGINT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason VARCHAR(500) NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_doctor_leave_dates (doctor_id, start_date, end_date),
    CONSTRAINT fk_doctor_leaves_doctor FOREIGN KEY (doctor_id) REFERENCES doctors (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE fee_change_requests (
    id BIGINT NOT NULL AUTO_INCREMENT,
    doctor_id BIGINT NOT NULL,
    proposed_fee DECIMAL(10, 2) NOT NULL,
    reason VARCHAR(1000) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    admin_comment VARCHAR(1000) NULL,
    created_at DATETIME(6) NOT NULL,
    decided_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    INDEX idx_fee_request_status (status),
    CONSTRAINT fk_fee_request_doctor FOREIGN KEY (doctor_id) REFERENCES doctors (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE notifications (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    type VARCHAR(40) NOT NULL,
    message VARCHAR(500) NOT NULL,
    reference_id BIGINT NULL,
    created_at DATETIME(6) NOT NULL,
    read_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    INDEX idx_notification_user_created (user_id, created_at),
    INDEX idx_notification_dedup (user_id, type, reference_id),
    CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE doctor_reviews (
    id BIGINT NOT NULL AUTO_INCREMENT,
    appointment_id BIGINT NOT NULL,
    patient_id BIGINT NOT NULL,
    doctor_id BIGINT NOT NULL,
    rating INT NOT NULL,
    comment VARCHAR(2000) NULL,
    approved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_doctor_review_appointment (appointment_id),
    INDEX idx_doctor_review_public (doctor_id, approved, created_at),
    CONSTRAINT fk_review_appointment FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE CASCADE,
    CONSTRAINT fk_review_patient FOREIGN KEY (patient_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_review_doctor FOREIGN KEY (doctor_id) REFERENCES doctors (id) ON DELETE CASCADE
) ENGINE=InnoDB;
