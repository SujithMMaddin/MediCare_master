import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent) },
  { path: 'specializations', loadComponent: () => import('./components/specializations/specializations.component').then(m => m.SpecializationsComponent) },

  // Public
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./components/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./components/register/register.component').then((m) => m.RegisterComponent)
  },

  // Patient
  {
    path: 'dashboard',
    canActivate: [authGuard, roleGuard],
    data: { role: 'PATIENT' },
    loadComponent: () =>
      import('./components/patient-dashboard/patient-dashboard.component').then(
        (m) => m.PatientDashboardComponent
      )
  },
  {
    path: 'patient/profile',
    canActivate: [authGuard, roleGuard],
    data: { role: 'PATIENT' },
    loadComponent: () => import('./components/profile/profile.component').then(m => m.ProfileComponent)
  },
  {
    path: 'notifications',
    canActivate: [authGuard],
    loadComponent: () => import('./components/notifications/notifications.component').then(m => m.NotificationsComponent)
  },
  { path: 'patient-history', canActivate: [authGuard], loadComponent: () => import('./components/patient-history/patient-history.component').then(m => m.PatientHistoryComponent) },
  {
    path: 'admin/reviews',
    canActivate: [authGuard, roleGuard],
    data: { role: 'ADMIN' },
    loadComponent: () => import('./components/review-moderation/review-moderation.component').then(m => m.ReviewModerationComponent)
  },
  {
    path: 'admin/leave-requests',
    canActivate: [authGuard, roleGuard],
    data: { role: 'ADMIN' },
    loadComponent: () => import('./components/leave-requests/leave-requests.component').then(m => m.LeaveRequestsComponent)
  },
  {
    path: 'doctors',
    loadComponent: () =>
      import('./components/doctor-list/doctor-list.component').then((m) => m.DoctorListComponent)
  },
  {
    path: 'doctors/:id',
    loadComponent: () =>
      import('./components/doctor-details/doctor-details.component').then(
        (m) => m.DoctorDetailsComponent
      )
  },
  {
    path: 'book',
    canActivate: [authGuard, roleGuard],
    data: { role: 'PATIENT' },
    loadComponent: () =>
      import('./components/book-appointment/book-appointment.component').then(
        (m) => m.BookAppointmentComponent
      )
  },
  {
    path: 'book/:doctorId',
    canActivate: [authGuard, roleGuard],
    data: { role: 'PATIENT' },
    loadComponent: () =>
      import('./components/book-appointment/book-appointment.component').then(
        (m) => m.BookAppointmentComponent
      )
  },
  {
    path: 'my-appointments',
    canActivate: [authGuard, roleGuard],
    data: { role: 'PATIENT' },
    loadComponent: () =>
      import('./components/my-appointments/my-appointments.component').then(
        (m) => m.MyAppointmentsComponent
      )
  },

  // Admin
  {
    path: 'doctor/appointments',
    canActivate: [authGuard, roleGuard],
    data: { role: 'DOCTOR' },
    loadComponent: () => import('./components/doctor-dashboard/doctor-dashboard.component').then(m => m.DoctorDashboardComponent)
  },
  {
    path: 'doctor/profile',
    canActivate: [authGuard, roleGuard],
    data: { role: 'DOCTOR' },
    loadComponent: () => import('./components/profile/profile.component').then(m => m.ProfileComponent)
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { role: 'ADMIN' },
    loadComponent: () =>
      import('./components/admin-dashboard/admin-dashboard.component').then(
        (m) => m.AdminDashboardComponent
      )
  },
  {
    path: 'admin/profile',
    canActivate: [authGuard, roleGuard],
    data: { role: 'ADMIN' },
    loadComponent: () => import('./components/profile/profile.component').then(m => m.ProfileComponent)
  },
  {
    path: 'admin/doctors',
    canActivate: [authGuard, roleGuard],
    data: { role: 'ADMIN' },
    loadComponent: () =>
      import('./components/manage-doctors/manage-doctors.component').then(
        (m) => m.ManageDoctorsComponent
      )
  },
  { path: 'admin/doctors/:id/availability', canActivate: [authGuard, roleGuard], data: { role: 'ADMIN' }, loadComponent: () => import('./components/doctor-schedule/doctor-schedule.component').then(m => m.DoctorScheduleComponent) },
  {
    path: 'admin/appointments',
    canActivate: [authGuard, roleGuard],
    data: { role: 'ADMIN' },
    loadComponent: () =>
      import('./components/manage-appointments/manage-appointments.component').then(
        (m) => m.ManageAppointmentsComponent
      )
  },

  { path: '**', redirectTo: '' }
];
