import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { WorkflowService } from '../../core/services/workflow.service';
import { Notification } from '../../core/models/workflow.model';
import { extractErrorMessage } from '../../core/services/error-message';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatCardModule, MatIconModule],
  template: `<div class="page"><div class="page-title"><h1>Notifications</h1></div>
    @if (error()) { <div class="error-banner">{{ error() }}</div> }
    @if (!items().length && !error()) { <mat-card><mat-card-content class="empty-state">You have no notifications.</mat-card-content></mat-card> }
    <div class="list">@for (item of items(); track item.id) {
      <mat-card [class.unread]="!item.readAt"><mat-card-content>
        <div class="row"><mat-icon>{{ item.readAt ? 'notifications' : 'mark_email_unread' }}</mat-icon>
          <div class="message"><strong>{{ label(item.type, item.message) }}</strong><p>{{ displayMessage(item) }}</p><small>{{ item.createdAt | date:'medium' }}</small></div>
          @if (destination(item)) { <button mat-button color="primary" (click)="open(item)">View</button> }
          @else { <small>Informational notice · no linked record</small> }
          @if (!item.readAt) { <button mat-button (click)="markRead(item)">Mark read</button> }
        </div>
      </mat-card-content></mat-card>
    }</div></div>`,
  styles: [`.list{display:grid;gap:12px}.unread{border-left:4px solid var(--mc-primary)}.row{display:flex;align-items:center;gap:12px}.row>mat-icon{color:var(--mc-primary)}.message{flex:1}.message p{margin:4px 0}.message small{color:var(--mc-muted)}`]
})
export class NotificationsComponent implements OnInit {
  private readonly api = inject(WorkflowService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  readonly items = signal<Notification[]>([]);
  readonly error = signal<string | null>(null);
  ngOnInit(): void {
    this.api.refreshUnread();
    this.api.notifications().subscribe({
      next: rows => this.items.set(rows),
      error: error => this.error.set(extractErrorMessage(error))
    });
  }
  markRead(item: Notification): void {
    this.api.markRead(item.id).subscribe({
      next: updated => this.items.update(rows => rows.map(row => row.id === updated.id ? updated : row)),
      error: error => this.error.set(extractErrorMessage(error))
    });
  }
  destination(item: Notification): string | null {
    if (!item.referenceId) return null;
    if (item.type === 'DOCTOR_LEAVE_REQUEST') return this.auth.isAdmin() ? '/admin/leave-requests' : null;
    if (['LEAVE_REQUEST_APPROVED', 'LEAVE_REQUEST_REJECTED', 'LEAVE_REQUEST_CANCELLED', 'DOCTOR_LEAVE_DECISION'].includes(item.type))
      return this.auth.isDoctor() ? '/doctor/profile' : null;
    if (item.type === 'FEE_CHANGE_REQUEST') return this.auth.isAdmin() ? '/admin/profile' : null;
    if (item.type.startsWith('APPOINTMENT_') || item.type.startsWith('SCHEDULE_CONFLICT') || item.type === 'DOCTOR_UNAVAILABLE') {
      if (this.auth.isAdmin()) return '/admin/appointments';
      if (this.auth.isDoctor()) return '/doctor/appointments';
      if (this.auth.isPatient()) return '/my-appointments';
    }
    if (item.type === 'FEE_REQUEST_DECISION' && this.auth.isDoctor()) return '/doctor/profile';
    return null;
  }
  open(item: Notification): void {
    const path = this.destination(item);
    if (!path) return;
    const target = item.type.includes('LEAVE') ? { requestId: item.referenceId }
      : item.type.includes('FEE') ? { feeRequestId: item.referenceId }
      : { appointmentId: item.referenceId };
    const go = () => this.router.navigate([path], { queryParams: target });
    if (!item.readAt) this.api.markRead(item.id).subscribe({ next: updated => { this.items.update(rows => rows.map(row => row.id === updated.id ? updated : row)); go(); }, error: err => this.error.set(extractErrorMessage(err)) });
    else go();
  }
  label(type: string, message = ''): string {
    const leaveLabels: Record<string, string> = {
      LEAVE_REQUEST_APPROVED: 'Leave Request Approved',
      LEAVE_REQUEST_REJECTED: 'Leave Request Rejected',
      LEAVE_REQUEST_CANCELLED: 'Leave Request Cancelled'
    };
    if (type === 'DOCTOR_LEAVE_DECISION') {
      if (/removed by an administrator|cancelled/i.test(message)) return 'Leave Request Cancelled';
      if (/was rejected/i.test(message)) return 'Leave Request Rejected';
      if (/was approved/i.test(message)) return 'Leave Request Approved';
      return 'Leave Request Update';
    }
    return leaveLabels[type]
      ?? type.replaceAll('_', ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());
  }

  displayMessage(item: Notification): string {
    if (item.type !== 'DOCTOR_LEAVE_DECISION') return item.message;
    const legacyMessage = /^Your leave request for (\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2}) was (approved|rejected|removed by an administrator)\.(?: Admin comment: (.+))?$/.exec(item.message);
    if (!legacyMessage) return item.message;

    const [, startDate, endDate, result, comment] = legacyMessage;
    const dateRange = `${this.formatLeaveDate(startDate)} to ${this.formatLeaveDate(endDate)}`;
    if (result === 'removed by an administrator') {
      return `Your approved leave for ${dateRange} was cancelled by an administrator.`;
    }
    if (result === 'rejected') {
      return `Your leave request for ${dateRange} was rejected.${comment ? ` Reason: ${comment}` : ''}`;
    }
    return `Your leave request for ${dateRange} has been approved.`;
  }

  private formatLeaveDate(value: string): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
  }
}
