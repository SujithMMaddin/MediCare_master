# Patient profile schema migration

The application is configured with `spring.jpa.hibernate.ddl-auto=update`. For the local setup, Hibernate creates `patient_profiles` and adds nullable `appointments.patient_profile_id` without removing appointment rows. The first authenticated patient-profile request creates the account's SELF profile and backfills that account's legacy appointments to it.

For an environment that manages schema changes outside Hibernate, run `V2__patient_profiles.sql`, `V3__consultation_fees_billing_profiles.sql`, `V4__doctor_workflows_notifications_reviews.sql`, `V5__appointment_schedule_conflicts.sql`, and `V6__doctor_leave_approval.sql` in order against `medicare_master_db`. V2 retains existing appointment rows and attaches them to each booking account's SELF profile. V3 adds fee, profile-photo, and billing columns/tables. V4 adds doctor practice/status data, schedule state, leaves, fee requests, notifications, and moderated reviews. V5 adds the appointment schedule-conflict flag without changing existing appointment data. V6 keeps existing leave records approved and adds request status and admin decision metadata. The migrations are one-time scripts; do not rerun them after applying.

New bookings require `patient_profile_id` through the API. The database column remains nullable for compatibility with legacy rows and historical non-patient records.
