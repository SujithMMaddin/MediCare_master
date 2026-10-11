import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { WorkflowService } from '../../core/services/workflow.service';
import { DoctorReview } from '../../core/models/workflow.model';
import { extractErrorMessage } from '../../core/services/error-message';

@Component({
  selector: 'app-review-moderation',
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatCardModule, MatIconModule],
  template: `<div class="page"><div class="page-title"><h1>Review moderation</h1></div>
    @if (error()) { <div class="error-banner">{{ error() }}</div> }
    @if (!reviews().length && !error()) { <mat-card><mat-card-content class="empty-state">No reviews to moderate.</mat-card-content></mat-card> }
    <div class="grid">@for (review of reviews(); track review.id) {
      <mat-card><mat-card-content><div class="header"><strong>{{ review.doctorName }}</strong><span>{{ review.rating }} / 5</span></div>
        <p>{{ review.comment || 'No written comment.' }}</p>
        <small>{{ review.patientName }} · {{ review.createdAt | date:'mediumDate' }}</small>
        <div class="actions">
          @if (!review.approved) { <button mat-flat-button color="primary" (click)="moderate(review,true)">Approve</button> }
          @else { <button mat-stroked-button (click)="moderate(review,false)">Hide</button> }
          <button mat-button color="warn" (click)="remove(review)">Delete</button>
        </div>
      </mat-card-content></mat-card>
    }</div></div>`,
  styles: [`.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}.header,.actions{display:flex;justify-content:space-between;align-items:center}.actions{justify-content:flex-start;gap:8px;margin-top:12px}small{color:var(--mc-muted)}`]
})
export class ReviewModerationComponent implements OnInit {
  private readonly api = inject(WorkflowService);
  readonly reviews = signal<DoctorReview[]>([]);
  readonly error = signal<string | null>(null);
  ngOnInit(): void { this.load(); }
  moderate(review: DoctorReview, approved: boolean): void {
    this.api.moderateReview(review.id, approved).subscribe({
      next: updated => this.reviews.update(rows => rows.map(row => row.id === updated.id ? updated : row)),
      error: err => this.error.set(extractErrorMessage(err))
    });
  }
  remove(review: DoctorReview): void {
    if (!confirm('Delete this review permanently?')) return;
    this.api.deleteReview(review.id).subscribe({
      next: () => this.reviews.update(rows => rows.filter(row => row.id !== review.id)),
      error: err => this.error.set(extractErrorMessage(err))
    });
  }
  private load(): void {
    this.api.reviews().subscribe({ next: rows => this.reviews.set(rows), error: err => this.error.set(extractErrorMessage(err)) });
  }
}
