-- Add approval workflow metadata to existing doctor leave rows.
-- Existing leave records remain approved to preserve their current booking behavior.
USE medicare_master_db;

ALTER TABLE doctor_leaves
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
    ADD COLUMN admin_comment VARCHAR(500) NULL,
    ADD COLUMN decided_at DATETIME(6) NULL;

ALTER TABLE doctor_leaves
    ALTER COLUMN status SET DEFAULT 'PENDING';
