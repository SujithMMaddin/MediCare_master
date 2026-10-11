import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { DoctorService } from '../../core/services/doctor.service';
import { Doctor } from '../../core/models/doctor.model';
import { extractErrorMessage } from '../../core/services/error-message';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-doctor-list',
  standalone: true,
  imports: [
    FormsModule, RouterLink, CurrencyPipe, DecimalPipe, MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="page">
      <div class="page-title">
        <h1>Our Doctors</h1>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Search by name or specialization</mat-label>
          <input matInput [ngModel]="search()" (ngModelChange)="search.set($event)" />
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
      </div>

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="40" /></div>
      } @else if (error()) {
        <div class="error-banner">{{ error() }}</div>
      } @else if (filtered().length === 0) {
        <div class="empty-state">No doctors found.</div>
      } @else {
        <div class="card-grid">
          @for (doc of filtered(); track doc.id) {
            <mat-card>
              <mat-card-header>
                @if (doc.profilePhotoUrl) { <img mat-card-avatar class="avatar" [src]="doc.profilePhotoUrl" alt="Doctor profile photo"> }
                @else { <mat-icon mat-card-avatar class="avatar">person</mat-icon> }
                <mat-card-title>{{ doc.name }}</mat-card-title>
                <mat-card-subtitle>{{ doc.specialization }}</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <p>
  <mat-icon>medical_services</mat-icon>
  {{ doc.specialization }}
</p>
                <p><mat-icon>payments</mat-icon>
                  {{ doc.consultationFee === null ? 'Fee not configured' : (doc.consultationFee | currency:'INR':'symbol':'1.2-2') }}
                </p>
                <p><mat-icon>star</mat-icon> {{ doc.averageRating === null ? 'No reviews yet' : (doc.averageRating | number:'1.1-1') + ' (' + doc.reviewCount + ')' }}</p>
                @if (doc.qualifications) { <p><mat-icon>school</mat-icon> {{ doc.qualifications }}</p> }
                @if (doc.experienceYears !== null) { <p><mat-icon>work_history</mat-icon> {{ doc.experienceYears }} years' experience</p> }
              </mat-card-content>
              <mat-card-actions>
                <a mat-button [routerLink]="['/doctors', doc.id]">Details</a>
                @if (auth.isPatient()) { <a mat-flat-button color="primary" [routerLink]="['/book', doc.id]">Book</a> }
              </mat-card-actions>
            </mat-card>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .avatar { background: #e0f2f1; color: var(--mc-primary-dark); display: flex; align-items: center; justify-content: center; object-fit: cover; }
    .availability { display: flex; align-items: center; gap: 6px; color: var(--mc-muted); }
    .availability mat-icon { font-size: 18px; width: 18px; height: 18px; }
    mat-card-actions { padding: 8px 16px 16px; }
  `]
})
export class DoctorListComponent implements OnInit {
  private readonly doctorService = inject(DoctorService);
  readonly auth = inject(AuthService);

  readonly doctors = signal<Doctor[]>([]);
  readonly search = signal('');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    return this.doctors().filter(
      (d) => d.name.toLowerCase().includes(term) || d.specialization.toLowerCase().includes(term)
    );
  });

  ngOnInit(): void {
    this.doctorService.getAll().subscribe({
      next: (docs) => {
        this.doctors.set(docs);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractErrorMessage(err));
        this.loading.set(false);
      }
    });
  }
}
