import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DoctorService } from '../../core/services/doctor.service';
import { Doctor } from '../../core/models/doctor.model';
import { extractErrorMessage } from '../../core/services/error-message';
import { WorkflowService } from '../../core/services/workflow.service';
import { DoctorReview } from '../../core/models/workflow.model';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-doctor-details',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DecimalPipe, MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="page narrow">
      <a mat-button routerLink="/doctors"><mat-icon>arrow_back</mat-icon> Back to doctors</a>

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="40" /></div>
      } @else if (error()) {
        <div class="error-banner">{{ error() }}</div>
      } @else {
        @if (doctor(); as doc) {
          <mat-card>
            <mat-card-header>
              @if (doc.profilePhotoUrl) { <img mat-card-avatar class="avatar" [src]="doc.profilePhotoUrl" alt="Doctor profile photo"> }
              @else { <mat-icon mat-card-avatar class="avatar">person</mat-icon> }
              <mat-card-title>{{ doc.name }}</mat-card-title>
              <mat-card-subtitle>{{ doc.specialization }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="row"><mat-icon>medical_information</mat-icon>
                <div><strong>Specialization</strong><div>{{ doc.specialization }}</div></div>
              </div>
              <div class="row"><mat-icon>star</mat-icon>
                <div><strong>Patient rating</strong><div>{{ doc.averageRating === null ? 'No approved ratings yet' : (doc.averageRating | number:'1.1-1') + ' / 5 (' + doc.reviewCount + ' reviews)' }}</div></div>
              </div>
              @if (doc.bio) { <div class="row"><mat-icon>info</mat-icon><div><strong>About</strong><div>{{ doc.bio }}</div></div></div> }
              @if (doc.qualifications) { <div class="row"><mat-icon>school</mat-icon><div><strong>Qualifications</strong><div>{{ doc.qualifications }}</div></div></div> }
              @if (doc.experienceYears !== null) { <div class="row"><mat-icon>work_history</mat-icon><div><strong>Experience</strong><div>{{ doc.experienceYears }} years</div></div></div> }
              @if (doc.phone) { <div class="row"><mat-icon>call</mat-icon><div><strong>Contact</strong><div>{{ doc.phone }}</div></div></div> }
              <div class="row"><mat-icon>payments</mat-icon><div><strong>Consultation fee</strong><div>{{ doc.consultationFee === null ? 'Fee not configured' : (doc.consultationFee | currency:'INR':'symbol':'1.2-2') }}</div></div></div>
              <div class="row"><mat-icon>schedule</mat-icon>
                <div><strong>Appointment times</strong><div>View available appointment slots when booking.</div></div>
              </div>
              <h3>Verified patient reviews</h3>
              @for (review of reviews(); track review.id) {
                <div class="review"><strong>{{ review.rating }} / 5</strong><p>{{ review.comment || 'No written comment.' }}</p></div>
              } @empty { <p>No approved reviews yet.</p> }
            </mat-card-content>
            <mat-card-actions>
              @if (doc.active && auth.isPatient()) {
                <a mat-flat-button color="primary" [routerLink]="['/book', doc.id]"><mat-icon>event</mat-icon> Book appointment</a>
              } @else if (!doc.active && auth.isPatient()) { <span>This doctor is temporarily unavailable for bookings.</span> }
            </mat-card-actions>
          </mat-card>
        }
      }
    </div>
  `,
  styles: [`
    .narrow { max-width: 640px; }
    .avatar { background: #e0f2f1; color: var(--mc-primary-dark); display: flex; align-items: center; justify-content: center; }
    .row { display: flex; gap: 12px; align-items: center; margin: 16px 0; }
    .row mat-icon { color: var(--mc-primary); }
    mat-card { margin-top: 12px; }
    mat-card-actions { padding: 8px 16px 16px; }
  `]
})
export class DoctorDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly doctorService = inject(DoctorService);
  private readonly workflow = inject(WorkflowService);
  readonly auth = inject(AuthService);

  readonly doctor = signal<Doctor | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly reviews = signal<DoctorReview[]>([]);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.doctorService.getById(id).subscribe({
      next: (doc) => {
        this.doctor.set(doc);
        this.workflow.reviewsForDoctor(doc.id).subscribe({
          next: reviews => this.reviews.set(reviews),
          error: err => this.error.set(extractErrorMessage(err))
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractErrorMessage(err));
        this.loading.set(false);
      }
    });
  }
}
