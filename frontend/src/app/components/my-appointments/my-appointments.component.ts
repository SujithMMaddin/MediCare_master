import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { WorkflowService } from '../../core/services/workflow.service';
import { AppointmentService } from '../../core/services/appointment.service';
import { AppointmentResponse } from '../../core/models/appointment.model';
import { AvailableSlot } from '../../core/services/appointment.service';
import { extractErrorMessage } from '../../core/services/error-message';

@Component({
  selector: 'app-my-appointments',
  standalone: true,
  imports: [
    DatePipe, CurrencyPipe, FormsModule, RouterLink, MatTableModule, MatCardModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule
  ],
  template: `
    <div class="page">
      <div class="page-title">
        <h1>My Appointments</h1>
        <a mat-flat-button color="primary" routerLink="/book"><mat-icon>add</mat-icon> New appointment</a>
      </div>
      @if (targetNotice()) { <div class="error-banner" role="status">{{ targetNotice() }}</div> }

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="40" /></div>
      } @else if (error()) {
        <div class="error-banner">{{ error() }}</div>
      } @else if (appointments().length === 0) {
        <mat-card><mat-card-content class="empty-state">You have not booked any appointments yet.</mat-card-content></mat-card>
      } @else {
        <mat-card class="table-card">
          <table mat-table [dataSource]="appointments()">
            <ng-container matColumnDef="patient">
              <th mat-header-cell *matHeaderCellDef>Patient</th>
              <td mat-cell *matCellDef="let a"><strong>{{ a.patientName }}</strong><br><small>{{ a.patientRelationship === 'SELF' ? 'Myself' : a.patientRelationship }}</small><br><small>Booked by {{ a.bookingAccountName }}</small></td>
            </ng-container>
            <ng-container matColumnDef="doctor">
              <th mat-header-cell *matHeaderCellDef>Doctor</th>
              <td mat-cell *matCellDef="let a">{{ a.doctorName }}</td>
            </ng-container>
            <ng-container matColumnDef="specialization">
              <th mat-header-cell *matHeaderCellDef>Specialization</th>
              <td mat-cell *matCellDef="let a">{{ a.specialization }}</td>
            </ng-container>
            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef>Date &amp; time</th>
              <td mat-cell *matCellDef="let a">{{ a.appointmentDate | date: 'EEE, d MMM y, h:mm a' }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let a">
                <span class="status-chip" [class]="a.status">{{ a.status }}</span>
                @if (a.status === 'NO_SHOW') { <small class="no-show-note">This appointment was recorded as a no-show. You may book another available time.</small> }
                @if (a.scheduleConflict) { <small class="schedule-conflict">Schedule conflict · Please reschedule</small> }
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
            <ng-container matColumnDef="reason">
              <th mat-header-cell *matHeaderCellDef>Reason</th>
              <td mat-cell *matCellDef="let a">{{ a.reason || '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let a">
                <div class="action-stack">
                @if (a.billingId) {
                  <button mat-button type="button" class="receipt-action" (click)="downloadReceipt(a.id)">
                    <mat-icon>download</mat-icon> Receipt
                  </button>
                }
                @if (a.status === 'PENDING' || a.status === 'CONFIRMED') {
                  <div class="appointment-actions">
                    <button mat-stroked-button color="primary" (click)="openReschedule(a)" [disabled]="busyId() === a.id">
                      <mat-icon>event</mat-icon> Reschedule
                    </button>
                    <button mat-stroked-button color="warn" (click)="cancel(a)" [disabled]="busyId() === a.id">
                      <mat-icon>cancel</mat-icon> Cancel
                    </button>
                  </div>
                }
                @if (a.status === 'COMPLETED' && !reviewedIds().has(a.id)) {
                  <button mat-stroked-button color="primary" type="button" (click)="openReview(a)">
                    <mat-icon>star</mat-icon> Rate Doctor
                  </button>
                } @else if (a.status === 'COMPLETED') { <small>Review submitted</small> }
                </div>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns" [class.target-appointment]="row.id === selectedAppointmentId()" [attr.id]="'appointment-' + row.id"></tr>
          </table>
        </mat-card>
      }

      @if (reschedulingAppointment(); as appointment) {
        <div class="modal-backdrop" (click)="closeReschedule()" (keydown.escape)="closeReschedule()">
          <section class="reschedule-modal" role="dialog" aria-modal="true" aria-labelledby="reschedule-title" (click)="$event.stopPropagation()">
            <div class="modal-heading">
              <div class="modal-icon"><mat-icon>event_available</mat-icon></div>
              <button mat-icon-button type="button" aria-label="Close rescheduling" (click)="closeReschedule()" [disabled]="busyId() === appointment.id">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <h2 id="reschedule-title">Reschedule appointment</h2>
            <p class="muted">Choose an available date and time for your appointment.</p>
            <div class="appointment-summary">
              <strong>{{ appointment.doctorName }}</strong>
              <span>{{ appointment.specialization }}</span>
              <span>Currently booked: {{ appointment.appointmentDate | date:'EEE, d MMM y · h:mm a' }}</span>
            </div>
            <label class="date-label" for="reschedule-date">Choose a date</label>
            <input id="reschedule-date" class="date-input" type="date" [min]="minRescheduleDate" [max]="maxRescheduleDate"
              [value]="rescheduleDate()" (change)="rescheduleDateChanged($any($event.target).value)">
            <div class="slots-section">
              <h3>Available times</h3>
              @if (loadingRescheduleSlots()) {
                <div class="slot-loading"><mat-spinner diameter="26" /><span>Checking availability…</span></div>
              } @else if (rescheduleError()) {
                <div class="error-banner" role="alert">{{ rescheduleError() }}</div>
              } @else if (!rescheduleSlots().length) {
                <p class="muted slot-empty">No available times on this date. Please choose another day.</p>
              } @else {
                <div class="slot-options">
                  @for (slot of rescheduleSlots(); track slot.time) {
                    <button type="button" class="slot-option" [class.selected]="selectedRescheduleSlot()?.time === slot.time"
                      [attr.aria-pressed]="selectedRescheduleSlot()?.time === slot.time" (click)="selectedRescheduleSlot.set(slot)">
                      {{ formatSlotTime(slot.time) }}
                    </button>
                  }
                </div>
              }
            </div>
            <div class="modal-actions">
              <button mat-button type="button" (click)="closeReschedule()" [disabled]="busyId() === appointment.id">Cancel</button>
              <button mat-flat-button color="primary" type="button" (click)="reschedule(appointment)"
                [disabled]="!selectedRescheduleSlot() || loadingRescheduleSlots() || busyId() === appointment.id">
                @if (busyId() === appointment.id) { <mat-spinner diameter="18" /> } @else { Confirm new time }
              </button>
            </div>
          </section>
        </div>
      }

      @if (reviewingAppointment(); as appointment) {
        <div class="modal-backdrop" (click)="closeReview()" (keydown.escape)="closeReview()">
          <section class="review-modal" role="dialog" aria-modal="true" aria-labelledby="review-title" (click)="$event.stopPropagation()">
            <div class="modal-heading">
              <div class="modal-icon"><mat-icon>star</mat-icon></div>
              <button mat-icon-button type="button" aria-label="Close rating" (click)="closeReview()">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <h2 id="review-title">Rate Doctor</h2>
            <p class="muted">Share your experience with {{ appointment.doctorName }}.</p>
            <div class="rating-field">
              <label for="doctor-rating">Your rating</label>
              <select id="doctor-rating" [ngModel]="ratingDrafts()[appointment.id] || 5"
                [ngModelOptions]="{standalone:true}" (ngModelChange)="setRating(appointment.id,$event)">
                <option [ngValue]="5">5 — Excellent</option>
                <option [ngValue]="4">4 — Very good</option>
                <option [ngValue]="3">3 — Good</option>
                <option [ngValue]="2">2 — Fair</option>
                <option [ngValue]="1">1 — Poor</option>
              </select>
            </div>
            <label class="review-label" for="doctor-review">Review <span class="muted">Optional</span></label>
            <textarea id="doctor-review" rows="4" maxlength="2000" placeholder="Tell us about your experience"
              [ngModel]="reviewDrafts()[appointment.id] || ''" [ngModelOptions]="{standalone:true}"
              (ngModelChange)="setReview(appointment.id,$event)"></textarea>
            <div class="modal-actions">
              <button mat-button type="button" (click)="closeReview()">Cancel</button>
              <button mat-flat-button color="primary" type="button" (click)="submitReview(appointment)">
                Submit review
              </button>
            </div>
          </section>
        </div>
      }
    </div>
  `,
  styles: [`
    .action-stack{display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:4px 0}.appointment-actions{display:flex;align-items:center;gap:8px}
    .receipt-action{padding-left:0}.appointment-actions button{white-space:nowrap}
    .schedule-conflict{display:block;margin-top:5px;color:#9a5700;font-weight:600}.target-appointment{outline:3px solid var(--mc-primary);outline-offset:-3px;background:#e8f5f2}.no-show-note{display:block;color:#8a4b08;margin-top:4px}
    .modal-backdrop{position:fixed;inset:0;z-index:1000;background:rgba(12,30,38,.58);backdrop-filter:blur(5px);display:grid;place-items:center;padding:20px}
    .reschedule-modal,.review-modal{width:min(100%,540px);max-height:calc(100vh - 40px);overflow:auto;background:#fff;border-radius:20px;padding:26px;box-shadow:0 24px 80px rgba(10,35,45,.25)}
    .modal-heading{display:flex;justify-content:space-between;align-items:center}.modal-icon{width:48px;height:48px;border-radius:15px;background:#e7f5f3;color:var(--mc-primary);display:grid;place-items:center}
    .reschedule-modal h2{margin:18px 0 4px}.reschedule-modal>p{margin:0 0 18px}.appointment-summary{display:grid;gap:4px;padding:14px 16px;border:1px solid #e5eeee;border-radius:14px;background:#f7fbfa;margin-bottom:20px}
    .appointment-summary>span,.muted{color:var(--mc-muted)}.date-label{display:block;font-weight:600;margin:0 0 8px}.date-input{width:100%;min-height:48px;border:1px solid #cad6d8;border-radius:10px;padding:10px 12px;font:inherit;color:#20343a;background:#fff}
    .date-input:focus{outline:2px solid var(--mc-primary);outline-offset:1px}.slots-section h3{font-size:1rem;margin:22px 0 10px}.slot-options{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:9px}
    .slot-option{border:1px solid #d8e3e4;border-radius:10px;padding:10px;background:#fff;color:#284247;font:inherit;cursor:pointer;transition:.16s}
    .slot-option:hover{border-color:var(--mc-primary);background:#f2faf8}.slot-option.selected{border-color:var(--mc-primary);background:#e7f5f3;color:#075a55;font-weight:700}
    .slot-loading{display:flex;align-items:center;gap:10px;color:var(--mc-muted)}.slot-empty{padding:12px 0}.modal-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:24px}
    .review-modal{width:min(100%,460px)}.review-modal h2{margin:18px 0 4px}.review-modal>p{margin:0 0 22px}
    .rating-field{display:grid;gap:8px;margin-bottom:18px}.rating-field label,.review-label{font-weight:600}.rating-field select,.review-modal textarea{width:100%;border:1px solid #cad6d8;border-radius:10px;padding:12px;font:inherit;color:#20343a;background:#fff}
    .review-modal textarea{resize:vertical;min-height:110px}.review-label{display:flex;justify-content:space-between;margin-bottom:8px}
    @media(max-width:600px){.reschedule-modal,.review-modal{padding:20px}.modal-actions{flex-direction:column-reverse}.modal-actions button{width:100%}.appointment-actions{gap:4px;flex-wrap:wrap}}
  `]
})
export class MyAppointmentsComponent implements OnInit {
  private readonly appointmentService = inject(AppointmentService);
  private readonly route = inject(ActivatedRoute);
  readonly targetNotice = signal<string | null>(null);
  readonly selectedAppointmentId = signal<number | null>(null);
  private readonly snackBar = inject(MatSnackBar);
  private readonly workflow = inject(WorkflowService);

  readonly columns = ['patient', 'doctor', 'specialization', 'date', 'status', 'fee', 'payment', 'reason', 'actions'];
  readonly appointments = signal<AppointmentResponse[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busyId = signal<number | null>(null);
  readonly reschedulingAppointment = signal<AppointmentResponse | null>(null);
  readonly rescheduleDate = signal('');
  readonly rescheduleSlots = signal<AvailableSlot[]>([]);
  readonly selectedRescheduleSlot = signal<AvailableSlot | null>(null);
  readonly loadingRescheduleSlots = signal(false);
  readonly rescheduleError = signal<string | null>(null);
  readonly ratingDrafts = signal<Record<number, number>>({});
  readonly reviewDrafts = signal<Record<number, string>>({});
  readonly reviewedIds = signal<Set<number>>(new Set());
  readonly reviewingAppointment = signal<AppointmentResponse | null>(null);
  readonly minRescheduleDate = this.localDateKey(new Date());
  readonly maxRescheduleDate = this.localDateKey(new Date(Date.now() + 89 * 86400000));
  private slotRequestId = 0;

  ngOnInit(): void {
    this.load();
    this.workflow.myReviews().subscribe({
      next: reviews => this.reviewedIds.set(new Set(reviews.map(review => review.appointmentId))),
      error: err => this.error.set(extractErrorMessage(err))
    });
  }

  setRating(id: number, value: number): void { this.ratingDrafts.update(rows => ({ ...rows, [id]: Number(value) })); }
  setReview(id: number, value: string): void { this.reviewDrafts.update(rows => ({ ...rows, [id]: value })); }

  openReview(appt: AppointmentResponse): void { this.reviewingAppointment.set(appt); }
  closeReview(): void { this.reviewingAppointment.set(null); }

  openReschedule(appt: AppointmentResponse): void {
    const bookedDate = appt.appointmentDate.slice(0, 10);
    const initialDate = bookedDate >= this.minRescheduleDate && bookedDate <= this.maxRescheduleDate
      ? bookedDate
      : this.minRescheduleDate;
    this.reschedulingAppointment.set(appt);
    this.rescheduleDate.set(initialDate);
    this.selectedRescheduleSlot.set(null);
    this.loadRescheduleSlots(appt.doctorId, initialDate);
  }

  closeReschedule(): void {
    if (this.busyId() !== null) return;
    this.slotRequestId++;
    this.reschedulingAppointment.set(null);
    this.rescheduleSlots.set([]);
    this.selectedRescheduleSlot.set(null);
    this.rescheduleError.set(null);
  }

  rescheduleDateChanged(date: string): void {
    const appointment = this.reschedulingAppointment();
    if (!appointment || !date || date < this.minRescheduleDate || date > this.maxRescheduleDate) return;
    this.rescheduleDate.set(date);
    this.selectedRescheduleSlot.set(null);
    this.loadRescheduleSlots(appointment.doctorId, date);
  }

  reschedule(appt: AppointmentResponse): void {
    const slot = this.selectedRescheduleSlot();
    if (!slot || slot.date !== this.rescheduleDate()) {
      this.snackBar.open('Choose an available date and time.', 'Close', { duration: 3000 });
      return;
    }
    const value = `${slot.date}T${slot.time.slice(0, 5)}:00`;
    this.busyId.set(appt.id);
    this.appointmentService.reschedule(appt.id, value).subscribe({
      next: updated => {
        this.appointments.update(rows => rows.map(row => row.id === updated.id ? updated : row));
        this.snackBar.open('Appointment rescheduled and sent for confirmation', 'OK', { duration: 3000 });
        this.busyId.set(null);
        this.reschedulingAppointment.set(null);
      },
      error: err => { this.snackBar.open(extractErrorMessage(err), 'Close', { duration: 5000 }); this.busyId.set(null); }
    });
  }

  formatSlotTime(time: string): string {
    const [hourText, minute] = time.split(':');
    const hour = Number(hourText);
    return `${hour % 12 || 12}:${minute} ${hour >= 12 ? 'PM' : 'AM'}`;
  }

  submitReview(appt: AppointmentResponse): void {
    const rating = this.ratingDrafts()[appt.id] ?? 5;
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      this.snackBar.open('Choose a rating from 1 to 5.', 'Close', { duration: 3000 });
      return;
    }
    this.workflow.createReview(appt.id, rating, this.reviewDrafts()[appt.id] ?? '').subscribe({
      next: () => {
        this.reviewedIds.update(ids => new Set([...ids, appt.id]));
        this.snackBar.open('Thank you. Your review will appear after moderation.', 'OK', { duration: 3000 });
        this.closeReview();
      },
      error: err => this.snackBar.open(extractErrorMessage(err), 'Close', { duration: 5000 })
    });
  }

  cancel(appt: AppointmentResponse): void {
    if (!confirm(`Cancel your appointment with ${appt.doctorName}?`)) {
      return;
    }
    this.busyId.set(appt.id);
    this.appointmentService.cancel(appt.id).subscribe({
      next: (updated) => {
        this.appointments.update((list) => list.map((a) => (a.id === updated.id ? updated : a)));
        this.snackBar.open('Appointment cancelled', 'OK', { duration: 3000 });
        this.busyId.set(null);
      },
      error: (err) => {
        this.snackBar.open(extractErrorMessage(err), 'Close', { duration: 5000 });
        this.busyId.set(null);
      }
    });
  }

  downloadReceipt(id: number): void {
    this.appointmentService.downloadReceipt(id).subscribe({
      next: blob => this.saveReceipt(blob, id),
      error: err => this.snackBar.open(extractErrorMessage(err), 'Close', { duration: 5000 })
    });
  }

  private saveReceipt(blob: Blob, id: number): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `medicare-receipt-${id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private load(): void {
    this.appointmentService.getMine().subscribe({
      next: (list) => {
        this.appointments.set(list);
        const id = Number(this.route.snapshot.queryParamMap.get('appointmentId'));
        if (id) {
          if (list.some(row => row.id === id)) this.selectedAppointmentId.set(id);
          else this.targetNotice.set(`Appointment ${id} is no longer available in your account. Your appointments are still shown below.`);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractErrorMessage(err));
        this.loading.set(false);
      }
    });
  }

  private loadRescheduleSlots(doctorId: number, date: string): void {
    const requestId = ++this.slotRequestId;
    this.loadingRescheduleSlots.set(true);
    this.rescheduleError.set(null);
    this.rescheduleSlots.set([]);
    this.appointmentService.getAvailableSlots(doctorId, date, date).subscribe({
      next: slots => {
        if (requestId !== this.slotRequestId) return;
        this.rescheduleSlots.set(slots);
        this.loadingRescheduleSlots.set(false);
      },
      error: err => {
        if (requestId !== this.slotRequestId) return;
        this.rescheduleError.set(extractErrorMessage(err));
        this.loadingRescheduleSlots.set(false);
      }
    });
  }

  private localDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
