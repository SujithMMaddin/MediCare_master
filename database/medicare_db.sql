-- MediCare database setup (MySQL 8+)
--
-- You do NOT have to run this file: the Spring Boot app creates the database
-- (createDatabaseIfNotExist=true), generates the tables through Hibernate
-- (ddl-auto=update) and seeds the admin + sample doctors on first start.
--
-- It is provided for people who prefer to create everything manually.

CREATE DATABASE IF NOT EXISTS medicare_master_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE medicare_master_db;

CREATE TABLE IF NOT EXISTS users (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password VARCHAR(255) NOT NULL,
    profile_photo_url VARCHAR(2048) NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    role VARCHAR(20) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_users_email (email)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS specializations (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    consultation_fee DECIMAL(10, 2) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_specializations_name (name)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS doctors (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    specialization_id BIGINT NOT NULL,
    consultation_fee DECIMAL(10, 2) NULL,
    bio VARCHAR(2000) NULL,
    qualifications VARCHAR(500) NULL,
    experience_years INT NULL,
    phone VARCHAR(30) NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_doctors_user (user_id),
    CONSTRAINT fk_doctors_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_doctors_specialization FOREIGN KEY (specialization_id) REFERENCES specializations (id)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS doctor_availability (
    id BIGINT NOT NULL AUTO_INCREMENT,
    doctor_id BIGINT NOT NULL,
    day_of_week VARCHAR(15) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration_minutes INT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id),
    KEY idx_availability_doctor_day (doctor_id, day_of_week),
    CONSTRAINT fk_availability_doctor FOREIGN KEY (doctor_id) REFERENCES doctors (id)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS patient_profiles (
    id BIGINT NOT NULL AUTO_INCREMENT,
    owner_id BIGINT NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    date_of_birth DATE NULL,
    relationship VARCHAR(20) NOT NULL,
    is_self BIT NOT NULL,
    profile_key VARCHAR(40) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_patient_profile_account_key UNIQUE (owner_id, profile_key),
    CONSTRAINT fk_patient_profile_owner FOREIGN KEY (owner_id) REFERENCES users (id)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS appointments (
    id BIGINT NOT NULL AUTO_INCREMENT,
    appointment_date DATETIME(6) NOT NULL,
    status VARCHAR(20) NOT NULL,
    reason VARCHAR(500) NULL,
    schedule_conflict BOOLEAN NOT NULL DEFAULT FALSE,
    user_id BIGINT NOT NULL,
    patient_profile_id BIGINT NULL,
    doctor_id BIGINT NOT NULL,
    consultation_fee DECIMAL(10, 2) NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_appointment_doctor_date (doctor_id, appointment_date),
    KEY idx_appointment_user (user_id),
    CONSTRAINT fk_appointments_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_appointments_profile FOREIGN KEY (patient_profile_id) REFERENCES patient_profiles (id),
    CONSTRAINT fk_appointments_doctor FOREIGN KEY (doctor_id) REFERENCES doctors (id)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS billing_records (
    id BIGINT NOT NULL AUTO_INCREMENT,
    appointment_id BIGINT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at DATETIME(6) NOT NULL,
    paid_at DATETIME(6) NULL,
    refunded_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_billing_records_appointment (appointment_id),
    CONSTRAINT fk_billing_records_appointment FOREIGN KEY (appointment_id) REFERENCES appointments (id)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS doctor_leaves (
    id BIGINT NOT NULL AUTO_INCREMENT,
    doctor_id BIGINT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason VARCHAR(500) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    admin_comment VARCHAR(500) NULL,
    created_at DATETIME(6) NOT NULL,
    decided_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    INDEX idx_doctor_leave_dates (doctor_id, start_date, end_date),
    CONSTRAINT fk_doctor_leaves_doctor FOREIGN KEY (doctor_id) REFERENCES doctors (id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS fee_change_requests (
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
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS notifications (
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
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS doctor_reviews (
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
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------------
-- Sample data
-- The application seeds the default admin, specializations, sample doctors,
-- their INR 500.00 default consultation fees, and availability on first start.
-- ---------------------------------------------------------------------------
