-- Fee snapshots, billing status/receipts, and editable profile photos.
-- Run once against medicare_master_db when Hibernate is not managing the schema.
USE medicare_master_db;

ALTER TABLE users
    ADD COLUMN profile_photo_url VARCHAR(2048) NULL;

ALTER TABLE specializations
    ADD COLUMN consultation_fee DECIMAL(10, 2) NULL;

ALTER TABLE doctors
    ADD COLUMN consultation_fee DECIMAL(10, 2) NULL;

ALTER TABLE appointments
    ADD COLUMN consultation_fee DECIMAL(10, 2) NULL;

CREATE TABLE billing_records (
    id BIGINT NOT NULL AUTO_INCREMENT,
    appointment_id BIGINT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at DATETIME(6) NOT NULL,
    paid_at DATETIME(6) NULL,
    refunded_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_billing_records_appointment (appointment_id),
    CONSTRAINT fk_billing_records_appointment
        FOREIGN KEY (appointment_id) REFERENCES appointments (id)
) ENGINE=InnoDB;
