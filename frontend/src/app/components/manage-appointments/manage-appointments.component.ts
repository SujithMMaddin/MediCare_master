import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';
import { CurrencyPipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AppointmentService } from '../../core/services/appointment.service';
import { AppointmentResponse } from '../../core/models/appointment.model';
import { extractErrorMessage } from '../../core/services/error-message';

@Component({
  selector: 'app-manage-appointments',
  standalone: true,
  imports: [
    DatePipe, CurrencyPipe, MatButtonModule, MatIconModule, MatSnackBarModule,
    MatTableModule,
    MatCardModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="page">
      <div class="page-title">
        <h1>Manage Appointments</h1>
      </div>
      @if (targetNotice()) { <div class="error-banner" role="status">{{ targetNotice() }}</div> }

      @if (loading()) {
        <div class="empty-state">
          <mat-spinner diameter="40" />
        </div>
      } @else if (error()) {
        <div class="error-banner">{{ error() }}</div>
      } @else if (appointments().length === 0) {
        <mat-card>
          <mat-card-content class="empty-state">
            No appointments have been booked yet.
          </mat-card-content>
        </mat-card>
      } @else {
        <mat-card class="table-card">
          <table mat-table [dataSource]="appointments()">

            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef>ID</th>
              <td mat-cell *matCellDef="let a">
                {{ a.id }}
              </td>
            </ng-container>

            <ng-container matColumnDef="patient">
              <th mat-header-cell *matHeaderCellDef>Patient</th>
              <td mat-cell *matCellDef="let a">
                <div>{{ a.patientName }}</div>
                <small class="muted">{{ a.patientRelationship }} · booked by {{ a.bookingAccountName }} ({{ a.bookingAccountEmail }})</small>
              </td>
            </ng-container>

            <ng-container matColumnDef="doctor">
              <th mat-header-cell *matHeaderCellDef>Doctor</th>
              <td mat-cell *matCellDef="let a">
                <div>{{ a.doctorName }}</div>
                <small class="muted">{{ a.specialization }}</small>
              </td>
            </ng-container>

            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef>
                Date &amp; time
              </th>
              <td mat-cell *matCellDef="let a">
                {{ a.appointmentDate | date: 'EEE, d MMM y, h:mm a' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let a">
                <span
                  class="status-chip"
                  [class]="a.status">
                  {{ a.status }}
                </span>
                @if (a.scheduleConflict) { <small class="schedule-conflict">Schedule conflict</small> }
              </td>
            </ng-container>
            <ng-container matColumnDef="fee">
              <th mat-header-cell *matHeaderCellDef>Total</th>
              <td mat-cell *matCellDef="let a">{{ a.totalAmount === null ? '—' : (a.totalAmount | currency:'INR':'symbol':'1.2-2') }}</td>
            </ng-container>
            <ng-container matColumnDef="payment">
              <th mat-header-cell *matHeaderCellDef>Payment</th>
              <td mat-cell *matCellDef="let a"><span class="status-chip" [class]="a.paymentStatus">{{ a.paymentStatus }}</span></td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Billing actions</th>
              <td mat-cell *matCellDef="let a">
                @if (a.paymentStatus === 'PENDING') {
                  <button mat-stroked-button color="primary" type="button" (click)="setPaymentStatus(a, 'PAID')" [disabled]="busyId() === a.id">Mark paid</button>
                } @else if (a.paymentStatus === 'PAID') {
                  <button mat-stroked-button color="warn" type="button" (click)="setPaymentStatus(a, 'REFUNDED')" [disabled]="busyId() === a.id">Refund</button>
                }
                @if (a.billingId) {
                  <button mat-button type="button" (click)="downloadReceipt(a.id)"><mat-icon>download</mat-icon> Receipt</button>
                }
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns" [class.target-appointment]="row.id===selectedAppointmentId()" [attr.id]="'appointment-'+row.id"></tr>

          </table>
        </mat-card>
      }
    </div>
  `,

  styles: [`
    .schedule-conflict{display:block;margin-top:5px;color:#9a5700;font-weight:600}
    .muted {
      color: var(--mc-muted);
    }
    .target-appointment { outline: 3px solid var(--mc-primary); outline-offset: -3px; background: #e8f5f2; }
  `]
})
export class ManageAppointmentsComponent implements OnInit {

  private readonly appointmentService = inject(AppointmentService);
  private readonly route = inject(ActivatedRoute);
  readonly targetNotice = signal<string | null>(null);
  readonly selectedAppointmentId = signal<number | null>(null);
  private readonly snackBar = inject(MatSnackBar);

  readonly columns = [
    'id',
    'patient',
    'doctor',
    'date',
    'status',
    'fee',
    'payment',
    'actions'
  ];

  readonly appointments = signal<AppointmentResponse[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busyId = signal<number | null>(null);

  ngOnInit(): void {
    this.load();
  }

  setPaymentStatus(appointment: AppointmentResponse, status: 'PAID' | 'REFUNDED'): void {
    this.busyId.set(appointment.id);
    this.appointmentService.updatePaymentStatus(appointment.id, status).subscribe({
      next: billing => {
        this.appointments.update(rows => rows.map(row => row.id === appointment.id
          ? { ...row, paymentStatus: billing.status, billingId: billing.id }
          : row));
        this.snackBar.open(`Payment marked ${status.toLowerCase()}`, 'OK', { duration: 2500 });
        this.busyId.set(null);
      },
      error: err => {
        this.snackBar.open(extractErrorMessage(err), 'Close', { duration: 5000 });
        this.busyId.set(null);
      }
    });
  }

  downloadReceipt(id: number): void {
    this.appointmentService.downloadReceipt(id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `medicare-receipt-${id}.txt`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: err => this.snackBar.open(extractErrorMessage(err), 'Close', { duration: 5000 })
    });
  }

  private load(): void {
    this.appointmentService.getAll().subscribe({
      next: (list) => {
        this.appointments.set(list);
        const id = Number(this.route.snapshot.queryParamMap.get('appointmentId'));
        if (id) {
          if (list.some(row => row.id === id)) this.selectedAppointmentId.set(id);
          else this.targetNotice.set(`Appointment ${id} no longer exists. All appointments are still shown below.`);
        }
        this.loading.set(false);
      },

      error: (err) => {
        this.error.set(extractErrorMessage(err));
        this.loading.set(false);
      }
    });
  }
}
