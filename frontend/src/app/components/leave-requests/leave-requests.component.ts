import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DoctorLeave } from '../../core/models/workflow.model';
import { extractErrorMessage } from '../../core/services/error-message';
import { WorkflowService } from '../../core/services/workflow.service';

@Component({
  selector: 'app-leave-requests',
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="page">
      <div class="page-title">
        <div>
          <h1>Doctor Leave Requests</h1>
          <p class="muted">Review, approve, reject, or remove doctor leave requests.</p>
        </div>
      </div>

      @if (error()) { <div class="error-banner" role="alert">{{ error() }}</div> }
      @if (requestNotice()) { <div class="error-banner" role="status">{{ requestNotice() }}</div> }
      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="36" /></div>
      } @else {
        <div class="status-summary">
          <mat-card><mat-card-content><strong>{{ count('PENDING') }}</strong><span>Pending</span></mat-card-content></mat-card>
          <mat-card><mat-card-content><strong>{{ count('APPROVED') }}</strong><span>Approved</span></mat-card-content></mat-card>
          <mat-card><mat-card-content><strong>{{ count('REJECTED') }}</strong><span>Rejected</span></mat-card-content></mat-card>
        </div>
        <mat-card>
          <mat-card-content>
            <div class="request-list">
              @for (leave of leaves(); track leave.id) {
                <article class="request-row" [class.selected-request]="leave.id === selectedRequestId()" [attr.id]="'leave-request-' + leave.id">
                  <div class="request-details">
                    <strong>{{ leave.doctorName }} · {{ formatDate(leave.startDate) }} – {{ formatDate(leave.endDate) }}</strong>
                    <span>{{ leave.reason || 'No reason provided' }}</span>
                    <small class="muted">Submitted {{ leave.createdAt | date:'medium' }} · {{ leave.status }}</small>
                    @if (leave.adminComment) { <small class="muted">Admin comment: {{ leave.adminComment }}</small> }
                  </div>
                  @if (leave.status === 'PENDING') {
                    <div class="decision-actions">
                      <button mat-flat-button color="primary" type="button" (click)="decide(leave, 'APPROVED')" [disabled]="busyId() === leave.id">
                        @if (busyId() === leave.id) { <mat-spinner diameter="18" /> } @else { Approve }
                      </button>
                      <button mat-stroked-button color="warn" type="button" (click)="decide(leave, 'REJECTED')" [disabled]="busyId() === leave.id">Reject</button>
                      <button mat-button color="warn" type="button" (click)="remove(leave)" [disabled]="busyId() === leave.id">Remove / Cancel</button>
                    </div>
                  } @else {
                    <div class="decision-actions">
                      <button mat-button color="warn" type="button" (click)="remove(leave)" [disabled]="busyId() === leave.id">
                        @if (busyId() === leave.id) { <mat-spinner diameter="18" /> } @else { Remove / Cancel }
                      </button>
                    </div>
                  }
                </article>
              } @empty {
                <p class="muted">No doctor leave requests have been submitted.</p>
              }
            </div>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .page{max-width:1050px}.muted{color:var(--mc-muted)}
    .status-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:18px 0}
    .status-summary mat-card-content{display:flex;align-items:center;justify-content:space-between;padding:18px}
    .status-summary strong{font-size:26px;color:var(--mc-primary)}
    .request-list{display:grid;gap:10px}
    .request-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px;border-radius:10px;background:#f5f8f8}
    .selected-request{outline:3px solid var(--mc-primary);background:#e8f5f2}
    .request-details{display:grid;gap:5px}.request-details strong{font-weight:600}
    .decision-actions{display:flex;align-items:center;gap:8px;flex-shrink:0}
    @media(max-width:650px){.status-summary{gap:8px}.status-summary mat-card-content{align-items:flex-start;flex-direction:column;gap:4px;padding:12px}.request-row{align-items:flex-start;flex-direction:column}.decision-actions{width:100%}}
  `]
})
export class LeaveRequestsComponent implements OnInit {
  private readonly workflow = inject(WorkflowService);
  private readonly route = inject(ActivatedRoute);
  readonly leaves = signal<DoctorLeave[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busyId = signal<number | null>(null);
  readonly requestNotice = signal<string | null>(null);
  readonly selectedRequestId = signal<number | null>(null);

  ngOnInit(): void {
    this.workflow.allLeaves().subscribe({
      next: leaves => {
        this.leaves.set(leaves);
        const id = Number(this.route.snapshot.queryParamMap.get('requestId'));
        if (id) {
          if (leaves.some(row => row.id === id)) this.selectedRequestId.set(id);
          else this.requestNotice.set(`Leave request ${id} is no longer available.`);
        }
        this.loading.set(false);
        this.error.set(null);
      },
      error: err => {
        this.error.set(extractErrorMessage(err));
        this.loading.set(false);
      }
    });
  }

  count(status: DoctorLeave['status']): number {
    return this.leaves().filter(leave => leave.status === status).length;
  }

  decide(leave: DoctorLeave, status: 'APPROVED' | 'REJECTED'): void {
    this.busyId.set(leave.id);
    this.workflow.decideLeave(leave.id, status).subscribe({
      next: updated => {
        this.leaves.update(rows => rows.map(row => row.id === updated.id ? updated : row));
        this.busyId.set(null);
      },
      error: err => {
        this.error.set(extractErrorMessage(err));
        this.busyId.set(null);
      }
    });
  }

  remove(leave: DoctorLeave): void {
    this.busyId.set(leave.id);
    this.workflow.removeLeaveAsAdmin(leave.id).subscribe({
      next: () => {
        this.leaves.update(rows => rows.filter(row => row.id !== leave.id));
        this.busyId.set(null);
      },
      error: err => {
        this.error.set(extractErrorMessage(err));
        this.busyId.set(null);
      }
    });
  }

  formatDate(value: string): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
  }
}
