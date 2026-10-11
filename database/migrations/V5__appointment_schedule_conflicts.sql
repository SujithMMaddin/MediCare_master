USE medicare_master_db;

ALTER TABLE appointments
    ADD COLUMN schedule_conflict BOOLEAN NOT NULL DEFAULT FALSE;
