import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { DoctorService } from '../../core/services/doctor.service';
import { AppointmentService } from '../../core/services/appointment.service';
import { AppointmentResponse } from '../../core/models/appointment.model';
import { CurrencyPipe } from '@angular/common';
import { WorkflowService } from '../../core/services/workflow.service';
import { AdminReport } from '../../core/models/workflow.model';
import { extractErrorMessage } from '../../core/services/error-message';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="page">
      <div class="page-title">
        <h1>Admin Dashboard</h1>
      </div>
      <p class="welcome">Signed in as {{ auth.currentUser()?.name }}</p>
      @if (reportError()) { <div class="error-banner">{{ reportError() }}</div> }

      <div class="card-grid">
        <mat-card>
          <mat-card-content class="stat">
            <mat-icon>medical_services</mat-icon>
            <div class="value">{{ doctorCount() }}</div>
            <div class="label">Doctor accounts</div>
          </mat-card-content>
          <mat-card-actions>
            <a mat-button color="primary" routerLink="/admin/doctors">Manage doctors</a>
          </mat-card-actions>
        </mat-card>
        <mat-card>
          <mat-card-content class="stat">
            <mat-icon>event_busy</mat-icon>
            <div class="value">{{ pendingLeaveRequests() }}</div>
            <div class="label">Pending doctor leave requests</div>
          </mat-card-content>
          <mat-card-actions>
            <a mat-button color="primary" routerLink="/admin/leave-requests">Manage doctor leave</a>
          </mat-card-actions>
        </mat-card>
        @if (report(); as stats) {
          <mat-card><mat-card-content class="stat"><mat-icon>people</mat-icon><div class="value">{{ stats.patients }}</div><div class="label">Patients</div></mat-card-content></mat-card>
          <mat-card><mat-card-content class="stat"><mat-icon>calendar_month</mat-icon><div class="value">{{ stats.activeSchedules }}</div><div class="label">Doctor schedules</div></mat-card-content></mat-card>
          <mat-card><mat-card-content class="stat"><mat-icon>payments</mat-icon><div class="value">{{ stats.pendingPayments }}</div><div class="label">Pending payments</div></mat-card-content></mat-card>
          <mat-card><mat-card-content class="stat"><mat-icon>currency_rupee</mat-icon><div class="value">{{ stats.revenue | currency:'INR':'symbol':'1.0-0' }}</div><div class="label">Paid revenue</div></mat-card-content></mat-card>
          <mat-card><mat-card-content class="stat"><mat-icon>request_quote</mat-icon><div class="value">{{ stats.pendingFeeRequests }}</div><div class="label">Fee requests</div></mat-card-content><mat-card-actions><a mat-button color="primary" routerLink="/admin/profile">Review fees</a></mat-card-actions></mat-card>
          <mat-card><mat-card-content class="stat"><mat-icon>rate_review</mat-icon><div class="value">{{ stats.pendingReviews }}</div><div class="label">Reviews for moderation</div></mat-card-content><mat-card-actions><a mat-button color="primary" routerLink="/admin/reviews">Moderate reviews</a></mat-card-actions></mat-card>
          <mat-card><mat-card-content class="stat"><mat-icon>notifications</mat-icon><div class="value">{{ stats.unreadNotifications }}</div><div class="label">Unread notifications</div></mat-card-content><mat-card-actions><a mat-button color="primary" routerLink="/notifications">View notifications</a></mat-card-actions></mat-card>
          <mat-card><mat-card-content class="stat"><mat-icon>event_available</mat-icon><div class="value">{{ stats.upcomingAppointments }}</div><div class="label">Upcoming appointments</div></mat-card-content></mat-card>
        }

        <mat-card>
          <mat-card-content class="stat">
            <mat-icon>event_note</mat-icon>
            <div class="value">{{ appointments().length }}</div>
            <div class="label">Total appointments</div>
          </mat-card-content>
          <mat-card-actions>
            <a mat-button color="primary" routerLink="/admin/appointments">Manage appointments</a>
          </mat-card-actions>
        </mat-card>

        <mat-card>
          <mat-card-content class="stat">
            <mat-icon>pending_actions</mat-icon>
            <div class="value">{{ count('PENDING') + count('CONFIRMED') }}</div>
            <div class="label">Active appointments</div>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-content class="stat">
            <mat-icon>task_alt</mat-icon>
            <div class="value">{{ count('COMPLETED') }}</div>
            <div class="label">Completed</div>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-content class="stat">
            <mat-icon>event_busy</mat-icon>
            <div class="value">{{ count('CANCELLED') }}</div>
            <div class="label">Cancelled</div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .welcome { color: var(--mc-muted); margin: -8px 0 20px; }
    .stat { text-align: center; padding-top: 16px; }
    .stat mat-icon { color: var(--mc-primary); font-size: 36px; width: 36px; height: 36px; }
    .stat .value { font-size: 36px; font-weight: 500; }
    .stat .label { color: var(--mc-muted); }
  `]
})
export class AdminDashboardComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly doctorService = inject(DoctorService);
  private readonly appointmentService = inject(AppointmentService);
  private readonly workflow = inject(WorkflowService);

  readonly doctorCount = signal(0);
  readonly appointments = signal<AppointmentResponse[]>([]);
  readonly report = signal<AdminReport | null>(null);
  readonly reportError = signal<string | null>(null);
  readonly pendingLeaveRequests = this.workflow.pendingLeaveCount;

  private readonly counts = computed(() => {
    const result: Record<string, number> = { PENDING: 0, CONFIRMED: 0, REJECTED: 0, CANCELLED: 0, COMPLETED: 0, NO_SHOW: 0 };
    this.appointments().forEach((a) => result[a.status]++);
    return result;
  });

  count(status: string): number {
    return this.counts()[status] ?? 0;
  }

  ngOnInit(): void {
    this.doctorService.getAll(true).subscribe({
      next: doctors => this.doctorCount.set(doctors.length),
      error: err => this.reportError.set(extractErrorMessage(err))
    });
    this.appointmentService.getAll().subscribe((a) => this.appointments.set(a));
    this.workflow.report().subscribe({
      next: report => { this.report.set(report); this.reportError.set(null); },
      error: err => this.reportError.set(extractErrorMessage(err))
    });
    this.workflow.allLeaves().subscribe({
      next: () => undefined,
      error: err => this.reportError.set(extractErrorMessage(err))
    });
  }
}
