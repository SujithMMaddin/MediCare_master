# MediCare Ã¢â‚¬â€œ Doctor Appointment System

Full-stack app: **Angular 18 + Angular Material** Ã¢â€ â€™ **REST** Ã¢â€ â€™ **Spring Boot 3 (Spring Security + JWT)** Ã¢â€ â€™ **JPA/Hibernate** Ã¢â€ â€™ **MySQL**.

```
medicare/
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ backend/                       Spring Boot (Maven, Java 17)
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ pom.xml
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ src/main/
Ã¢â€â€š       Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ resources/application.properties
Ã¢â€â€š       Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ java/com/medicare/
Ã¢â€â€š           Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ MediCareApplication.java
Ã¢â€â€š           Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ config/            SecurityConfig, DataInitializer (admin + sample doctors)
Ã¢â€â€š           Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ controller/        AuthController, DoctorController, AppointmentController
Ã¢â€â€š           Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ service/           AuthService, DoctorService, AppointmentService
Ã¢â€â€š           Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ repository/        UserRepository, DoctorRepository, AppointmentRepository
Ã¢â€â€š           Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ entity/            User, Doctor, Appointment, Role, AppointmentStatus
Ã¢â€â€š           Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ dto/               Register/Login/Doctor/Appointment requests + responses, ErrorResponse
Ã¢â€â€š           Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ security/          JwtService, JwtAuthenticationFilter, CustomUserDetailsService,
Ã¢â€â€š           Ã¢â€â€š                      RestAuthenticationEntryPoint, RestAccessDeniedHandler
Ã¢â€â€š           Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ exception/         custom exceptions + GlobalExceptionHandler (@RestControllerAdvice)
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ frontend/                      Angular 18 (standalone components, Angular Material)
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ src/app/
Ã¢â€â€š       Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ app.config.ts / app.routes.ts / app.component.ts
Ã¢â€â€š       Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ core/
Ã¢â€â€š       Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ models/            auth, doctor, appointment
Ã¢â€â€š       Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ services/          AuthService, DoctorService, AppointmentService, error-message
Ã¢â€â€š       Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ guards/            authGuard, guestGuard, roleGuard
Ã¢â€â€š       Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ interceptors/      authInterceptor (adds Bearer token)
Ã¢â€â€š       Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ components/            navbar, login, register, patient-dashboard, doctor-list,
Ã¢â€â€š                                  doctor-details, book-appointment, my-appointments,
Ã¢â€â€š                                  admin-dashboard, manage-doctors, manage-appointments
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ database/medicare_db.sql       optional manual schema + sample doctors
Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ postman/MediCare.postman_collection.json
```

## Prerequisites

- JDK 17+
- Maven 3.9+
- Node.js 18.19+ / 20 / 22 and npm
- MySQL 8+ running on `localhost:3306`

## 1. Database

Nothing to do manually — the backend creates `medicare_master_db`, the tables, the default admin and the sample doctors on first start.
For a clean manual setup, run `database/medicare_db.sql`. For an existing schema managed outside Hibernate, apply `database/migrations/V2__patient_profiles.sql` if needed, then V3 and V4 in order.

Set your MySQL credentials (defaults are `root` / `root`):

```bash
# Linux / macOS
export DB_USERNAME=root
export DB_PASSWORD=your_mysql_password

# Windows PowerShell
$env:DB_USERNAME="root"; $env:DB_PASSWORD="your_mysql_password"
```

or edit `backend/src/main/resources/application.properties`.

## 2. Run the backend

```bash
cd backend
mvn spring-boot:run
```

API is served on **http://localhost:8080**. To build a jar instead: `mvn clean package` then `java -jar target/medicare-backend-1.0.0.jar`.

## 3. Run the frontend

```bash
cd frontend
npm install
npm start          # = ng serve
```

Open **http://localhost:4200**.

## Consultation fees and billing

Admins can manage INR fee defaults by specialization and doctor-specific overrides from **Admin → Profile & fees**. New appointments capture the current fee as an immutable billing amount and start with payment status `PENDING`. Admins can mark a bill `PAID` or refund a paid bill; patients, the assigned doctor, and admins can download a text receipt from appointment views. Online payment processing is not configured.

Admins, doctors, and patients can edit their name and email, upload a profile photo from their device with an in-page preview, and change their password from a modal on their profile page. Doctor profiles show their specialization, current fee, and weekly schedule.

Patients can edit their account profile and upload a profile photo (PNG, JPEG, GIF, or WebP up to 5 MB). Uploaded photos are stored in the backend `uploads/profile-photos` directory by default; set `PROFILE_PHOTO_DIRECTORY` to choose another location. Doctors can maintain their professional bio, qualifications, experience, contact phone, weekly availability/slot lengths, and submit date-range leave requests. Leave requests require administrator approval; only approved dates are excluded from booking availability, and new bookings are blocked for disabled doctors. Patients reschedule through a date-and-slot picker that uses the same live doctor availability as booking. Doctors may request fee changes with a reason; an administrator's approval applies the new doctor-specific fee, while rejection requires an explanation.

Updating a doctor's weekly availability or leave never moves or cancels booked appointments. If a future pending or confirmed appointment no longer fits the updated schedule, it remains booked and is marked as a schedule conflict; both the patient and doctor receive a notification, and the patient can reschedule into a currently available slot.

Patients can reschedule active appointments subject to the same slot, beneficiary-overlap, booking-limit, and doctor-availability checks as a new booking. Rescheduled appointments return to `PENDING` for doctor confirmation; the consultation fee remains the amount captured when first booked. Completed appointments can be rated once (1–5); reviews need administrator approval before they appear publicly and affect the doctor's average.

In-app notifications are stored for appointment events, doctor unavailability, leave-request approvals, rejections, and cancellations; pending leave submissions notify administrators without sending the doctor a decision notification. Leave notifications show the date range and rejection reason when provided, and duplicate alerts for the same action are suppressed. The backend schedules next-day reminders at 9 a.m. Server time. The admin dashboard includes counts for doctors, patients, appointments and schedules, pending leave and fee requests, reviews/payments, unread notifications, and paid revenue. Admins review doctor leave requests at `/admin/leave-requests`, where they can approve, reject, or remove/cancel a request.

## Default accounts

| Role    | Email                | Password   |
|---------|----------------------|------------|
| ADMIN   | admin@medicare.com   | Admin@123  |
| PATIENT | register via the UI  |            |

Change the admin credentials in `application.properties` (`app.admin.*`) **before** the first start, and set a real `JWT_SECRET` (Base64, Ã¢â€°Â¥ 32 bytes) for anything beyond local development.

## REST API

| Method | Endpoint                          | Access          | Body |
|--------|-----------------------------------|-----------------|------|
| POST   | `/api/auth/register`              | public          | `{name, email, password}` |
| POST   | `/api/auth/login`                 | public          | `{email, password}` |
| GET    | `/api/doctors`                    | public          | Optional `specializationId` filter |
| GET    | `/api/doctors/{id}`               | public          | --- |
| GET    | `/api/doctors/{id}/available-slots?from=YYYY-MM-DD&to=YYYY-MM-DD` | public | Up to 90 days |
| POST   | `/api/doctors`                    | ADMIN           | Doctor details |
| PUT    | `/api/doctors/{id}`               | ADMIN           | Doctor details |
| PUT    | `/api/doctors/{id}/fee`           | ADMIN           | `{consultationFee}` in INR |
| DELETE | `/api/doctors/{id}/fee`           | ADMIN           | Use specialization default |
| DELETE | `/api/doctors/{id}`               | ADMIN           | -------- |
| PUT    | `/api/specializations/{id}/fee`   | ADMIN           | `{consultationFee}` in INR |
| GET    | `/api/profile`                    | authenticated   | Own profile, practice, and schedule |
| PUT    | `/api/profile`                    | authenticated   | `{name,email,profilePhotoUrl}` |
| PUT    | `/api/profile/password`           | authenticated   | `{currentPassword,newPassword}` |
| POST   | `/api/profile/photo`              | authenticated   | multipart form field `file` (PNG/JPEG/GIF/WebP, max 5 MB) |
| PUT    | `/api/profile/doctor-details`     | DOCTOR          | `{bio,qualifications,experienceYears,phone}` |
| PUT    | `/api/doctors/{id}/status`        | ADMIN           | `{active}` |
| POST   | `/api/doctors/{id}/availability`  | ADMIN/own doctor | Weekly availability |
| PUT    | `/api/doctors/{id}/availability/{availabilityId}` | ADMIN/own doctor | Update schedule |
| DELETE | `/api/doctors/{id}/availability/{availabilityId}` | ADMIN/own doctor | Delete schedule |
| GET/POST/DELETE | `/api/doctor/leaves`      | DOCTOR          | List, request, or remove pending own leave |
| GET | `/api/doctor/leaves/admin` | ADMIN | Review all doctor leave requests |
| PUT | `/api/doctor/leaves/{id}/decision` | ADMIN | Approve or reject a leave request |
| DELETE | `/api/doctor/leaves/admin/{id}` | ADMIN | Remove or cancel a doctor leave request |
| POST   | `/api/fee-change-requests`        | DOCTOR          | `{proposedFee,reason}` |
| GET    | `/api/fee-change-requests/my`     | DOCTOR          | Own fee requests |
| GET/PUT| `/api/fee-change-requests`        | ADMIN           | List and decide fee requests |
| GET    | `/api/patient-profiles`            | PATIENT         | Own profiles; creates SELF if needed |
| POST   | `/api/patient-profiles`            | PATIENT         | `{fullName,dateOfBirth,relationship}` |
| POST   | `/api/appointments`               | PATIENT         | `{doctorId,patientProfileId,appointmentDate,reason?}` |
| GET    | `/api/appointments/my`            | PATIENT         | -------- |
| GET    | `/api/appointments/all`           | ADMIN           | -------- |
| GET    | `/api/appointments/{id}/receipt`  | owner/doctor/admin | Download text receipt |
| GET    | `/api/billing`                    | ADMIN           | Billing records |
| PUT    | `/api/billing/appointments/{id}/status` | ADMIN    | `{status: "PAID"|"REFUNDED"}` |
| PUT    | `/api/appointments/{id}/cancel`   | PATIENT (owner) | -------- |
| PUT    | `/api/appointments/{id}/reschedule` | PATIENT (owner) | `{appointmentDate}` |
| POST   | `/api/appointments/{id}/reviews`  | PATIENT (completed appointment) | `{rating,comment?}` |
| GET    | `/api/doctors/{id}/reviews`       | public          | Approved reviews |
| GET/PUT/DELETE | `/api/reviews/admin/**`    | ADMIN           | Moderate or remove reviews |
| GET/PUT| `/api/notifications/**`          | authenticated   | Read own notifications |
| GET    | `/api/admin/reports`              | ADMIN           | Operational/payment summary |
| PUT    | `/api/appointments/{id}/confirm`  | DOCTOR (owner)  | --- |
| PUT    | `/api/appointments/{id}/reject`   | DOCTOR (owner)  | --- |
| PUT    | `/api/appointments/{id}/complete` | DOCTOR (owner)  | --- |
| PUT    | `/api/appointments/{id}/no-show`  | DOCTOR (owner)  | --- |

Authenticated calls need `Authorization: Bearer <JWT>`.

`LoginResponse` (login and register): `{ token, type, id, name, email, role }`.

Errors always look like:

```json
{ "timestamp": "...", "status": 400, "error": "Bad Request", "message": "Validation failed",
  "fieldErrors": { "email": "Email must be valid" } }
```

| Situation                         | Status |
|-----------------------------------|--------|
| Validation error / invalid date range | 400 |
| Bad credentials / missing or expired token | 401 |
| Wrong role / cancelling someone else's appointment | 403 |
| User, doctor or appointment not found | 404 |
| Email already registered          | 409 |
| Booking conflict / active appointment limit | 409 |
| Booking cooldown exceeded | 429 |

Business rules: a patient account can have at most three active upcoming appointments by default; only PENDING and CONFIRMED count. Each account has a 10-second booking cooldown. Beneficiary profiles belong to one booking account. A patient profile cannot have overlapping active appointments, and a doctor slot can only be booked once. CANCELLED and REJECTED slots are released.

## Testing with Postman

1. Import `postman/MediCare.postman_collection.json`.
2. Run **Auth Ã¢â€ â€™ Login admin** and **Auth Ã¢â€ â€™ Register patient** (they save the tokens into collection variables).
3. Run the other requests in any order Ã¢â‚¬â€œ each one already sends the right `Authorization` header.

Equivalent curl examples:

```bash
# Login as admin
curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@medicare.com","password":"Admin@123"}'

# Register a patient
curl -s -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Patient","email":"john@example.com","password":"secret123"}'

# List doctors
curl -s http://localhost:8080/api/doctors -H "Authorization: Bearer <JWT>"

# Book an appointment (patient token)
curl -s -X POST http://localhost:8080/api/appointments \
  -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" \
  -d '{"doctorId":1,"patientProfileId":1,"appointmentDate":"2027-01-15T10:30:00","reason":"Checkup"}'

# Admin: mark an appointment completed
curl -s -X PUT http://localhost:8080/api/appointments/1/status \
  -H "Authorization: Bearer <ADMIN_JWT>" -H "Content-Type: application/json" \
  -d '{"status":"COMPLETED"}'
```

## Configuration notes

- CORS allows `http://localhost:4200` (`app.cors.allowed-origins`, comma separated).
- The frontend API base URL lives in `frontend/src/environments/environment.ts`.
- JWT lifetime is 24h (`app.jwt.expiration-ms`). The Angular interceptor logs the user out automatically when the server answers 401 on an authenticated call.

## Booking and patient profiles

Booking limits are configurable with `MEDICARE_MAX_ACTIVE_APPOINTMENTS` (default `3`) and `MEDICARE_BOOKING_COOLDOWN_SECONDS` (default `10`). The cooldown is in-memory for a single backend instance.

Hibernate `ddl-auto=update` adds the patient profile table and nullable appointment profile column without deleting existing rows. The first patient-profile request creates the account SELF profile and backfills its legacy appointments. For externally managed schemas, run `database/migrations/V2__patient_profiles.sql` once before deploying; see `database/migrations/README.md`.

The homepage and doctor/specialty browsing are public. Booking and patient profiles require a PATIENT JWT.
