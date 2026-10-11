import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { AppointmentService } from '../../core/services/appointment.service';
import { DoctorService } from '../../core/services/doctor.service';
import { AppointmentResponse } from '../../core/models/appointment.model';

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="page">
      <div class="page-title">
        <h1>Hello, {{ auth.currentUser()?.name }} 👋</h1>
      </div>

      <div class="card-grid">
        <mat-card>
          <mat-card-content class="stat">
            <mat-icon>medical_services</mat-icon>
            <div class="value">{{ doctorCount() }}</div>
            <div class="label">Doctors available</div>
          </mat-card-content>
          <mat-card-actions>
            <a mat-button color="primary" routerLink="/doctors">Browse doctors</a>
          </mat-card-actions>
        </mat-card>

        <mat-card>
          <mat-card-content class="stat">
            <mat-icon>event_available</mat-icon>
            <div class="value">{{ upcoming().length }}</div>
            <div class="label">Upcoming appointments</div>
          </mat-card-content>
          <mat-card-actions>
            <a mat-button color="primary" routerLink="/my-appointments">View appointments</a>
          </mat-card-actions>
        </mat-card>

        <mat-card>
          <mat-card-content class="stat">
            <mat-icon>history</mat-icon>
            <div class="value">{{ appointments().length }}</div>
            <div class="label">Total appointments</div>
          </mat-card-content>
          <mat-card-actions>
            <a mat-button color="primary" routerLink="/book">Book a new one</a>
          </mat-card-actions>
        </mat-card>
      </div>

      <h2 class="section-title">Next appointment</h2>
      @if (next(); as appt) {
        <mat-card>
          <mat-card-content class="next">
            <mat-icon>schedule</mat-icon>
            <div>
             <div class="doc">{{ appt.doctorName }} · {{ appt.specialization }}</div>
              <div class="when">{{ appt.appointmentDate | date: 'EEEE, d MMM y, h:mm a' }}</div>
            </div>
          </mat-card-content>
        </mat-card>
      } @else {
        <mat-card>
          <mat-card-content class="empty-state">
            You have no upcoming appointments.
            <div><a mat-flat-button color="primary" routerLink="/doctors">Find a doctor</a></div>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .stat { text-align: center; padding-top: 16px; }
    .stat mat-icon { color: var(--mc-primary); font-size: 36px; width: 36px; height: 36px; }
    .stat .value { font-size: 36px; font-weight: 500; }
    .stat .label { color: var(--mc-muted); }
    .section-title { margin: 28px 0 12px; font-weight: 500; color: var(--mc-primary-dark); }
    .next { display: flex; align-items: center; gap: 16px; padding-top: 16px; }
    .next mat-icon { color: var(--mc-primary); font-size: 32px; width: 32px; height: 32px; }
    .doc { font-size: 18px; font-weight: 500; }
    .when { color: var(--mc-muted); }
    .empty-state a { margin-top: 12px; }
  `]
})
export class PatientDashboardComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly appointmentService = inject(AppointmentService);
  private readonly doctorService = inject(DoctorService);

  readonly doctorCount = signal(0);
  readonly appointments = signal<AppointmentResponse[]>([]);

  readonly upcoming = computed(() =>
    this.appointments()
     .filter(
  (a) =>
    (a.status === 'PENDING' || a.status === 'CONFIRMED') &&
    new Date(a.appointmentDate) > new Date()
)
      .sort((a, b) => a.appointmentDate.localeCompare(b.appointmentDate))
  );
  readonly next = computed(() => this.upcoming()[0] ?? null);

  ngOnInit(): void {
    this.doctorService.getAll().subscribe((d) => this.doctorCount.set(d.length));
    this.appointmentService.getMine().subscribe((a) => this.appointments.set(a));
  }
}
