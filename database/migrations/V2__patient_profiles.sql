-- Run once against an existing MediCare database before deploying the family-profile release.
-- This migration preserves all appointment rows and backfills them to each account's SELF profile.
USE medicare_master_db;

CREATE TABLE patient_profiles (
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
) ENGINE=InnoDB;

INSERT INTO patient_profiles (owner_id, full_name, date_of_birth, relationship, is_self, profile_key)
SELECT u.id, u.name, NULL, 'SELF', b'1', 'SELF'
FROM users u
WHERE u.role = 'PATIENT';

ALTER TABLE appointments ADD COLUMN patient_profile_id BIGINT NULL;

UPDATE appointments a
JOIN patient_profiles p ON p.owner_id = a.user_id AND p.profile_key = 'SELF'
SET a.patient_profile_id = p.id
WHERE a.patient_profile_id IS NULL;

ALTER TABLE appointments
    ADD CONSTRAINT fk_appointment_patient_profile
    FOREIGN KEY (patient_profile_id) REFERENCES patient_profiles (id);

-- The column stays nullable so legacy/non-patient rows are not discarded. New bookings require it in the API.
