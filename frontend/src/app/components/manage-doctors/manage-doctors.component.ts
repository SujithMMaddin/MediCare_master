import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { DoctorService } from '../../core/services/doctor.service';
import { SpecializationService } from '../../core/services/specialization.service';

import { Doctor, DoctorRequest } from '../../core/models/doctor.model';
import { Specialization } from '../../core/models/specialization.model';

import { extractErrorMessage } from '../../core/services/error-message';

@Component({
  selector: 'app-manage-doctors',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    ReactiveFormsModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="page">

      <div class="page-title">
        <h1>Manage Doctors</h1>

        @if (!formOpen()) {
          <button mat-flat-button color="primary" (click)="openCreate()">
            <mat-icon>add</mat-icon>
            Add doctor
          </button>
        }
      </div>

      @if (formOpen()) {
        <mat-card class="form-card">

          <mat-card-header>
            <mat-card-title>
              {{ editingId() ? 'Edit doctor' : 'Add doctor' }}
            </mat-card-title>
          </mat-card-header>

          <mat-card-content>

            @if (formError()) {
              <div class="error-banner">
                {{ formError() }}
              </div>
            }

            <form [formGroup]="form" (ngSubmit)="save()" novalidate>

              <div class="form-row">

                <!-- Name -->
                <mat-form-field appearance="outline">
                  <mat-label>Name</mat-label>

                  <input
                    matInput
                    formControlName="name"
                  />

                  @if (form.controls.name.hasError('required')) {
                    <mat-error>Name is required</mat-error>
                  } @else if (form.controls.name.hasError('minlength')) {
                    <mat-error>
                      Name must be at least 2 characters
                    </mat-error>
                  }
                </mat-form-field>


                <!-- Email -->
                <mat-form-field appearance="outline">
                  <mat-label>Email</mat-label>

                  <input
                    matInput
                    type="email"
                    formControlName="email"
                  />

                  @if (form.controls.email.hasError('required')) {
                    <mat-error>Email is required</mat-error>
                  } @else if (form.controls.email.hasError('email')) {
                    <mat-error>Enter a valid email</mat-error>
                  }
                </mat-form-field>


                <!-- Password -->
                @if (!editingId()) {
                  <mat-form-field appearance="outline">
                    <mat-label>Password</mat-label>

                    <input
                      matInput
                      type="password"
                      formControlName="password"
                    />

                    @if (form.controls.password.hasError('required')) {
                      <mat-error>Password is required</mat-error>
                    } @else if (form.controls.password.hasError('minlength')) {
                      <mat-error>
                        Password must be at least 6 characters
                      </mat-error>
                    }
                  </mat-form-field>
                }


                <!-- Specialization -->
                <mat-form-field appearance="outline">
                  <mat-label>Specialization</mat-label>

                  <mat-select formControlName="specializationId">

                    @for (specialization of specializations(); track specialization.id) {
                      <mat-option [value]="specialization.id">
                        {{ specialization.name }}
                      </mat-option>
                    }

                  </mat-select>

                  @if (form.controls.specializationId.hasError('required')) {
                    <mat-error>
                      Specialization is required
                    </mat-error>
                  }

                </mat-form-field>

              </div>


              <div class="actions">

                <button
                  mat-stroked-button
                  type="button"
                  (click)="closeForm()">
                  Cancel
                </button>

                <button
                  mat-flat-button
                  color="primary"
                  type="submit"
                  [disabled]="saving()">

                  @if (saving()) {
                    <mat-spinner diameter="20"></mat-spinner>
                  } @else {
                    {{ editingId() ? 'Update' : 'Create' }}
                  }

                </button>

              </div>

            </form>

          </mat-card-content>

        </mat-card>
      }


      @if (loading()) {

        <div class="empty-state">
          <mat-spinner diameter="40"></mat-spinner>
        </div>

      } @else if (error()) {

        <div class="error-banner">
          {{ error() }}
        </div>

      } @else if (doctors().length === 0) {

        <mat-card>
          <mat-card-content class="empty-state">
            No doctors yet. Add the first one.
          </mat-card-content>
        </mat-card>

      } @else {

        <mat-card class="table-card">

          <table mat-table [dataSource]="doctors()">

            <!-- ID -->
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef>
                ID
              </th>

              <td mat-cell *matCellDef="let d">
                {{ d.id }}
              </td>
            </ng-container>


            <!-- Name -->
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>
                Name
              </th>

              <td mat-cell *matCellDef="let d">
                {{ d.name }}
              </td>
            </ng-container>


            <!-- Email -->
            <ng-container matColumnDef="email">
              <th mat-header-cell *matHeaderCellDef>
                Email
              </th>

              <td mat-cell *matCellDef="let d">
                {{ d.email }}
              </td>
            </ng-container>


            <!-- Specialization -->
            <ng-container matColumnDef="specialization">
              <th mat-header-cell *matHeaderCellDef>
                Specialization
              </th>

              <td mat-cell *matCellDef="let d">
                {{ d.specialization }}
              </td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Account status</th>
              <td mat-cell *matCellDef="let d">{{ d.active ? 'Active' : 'Disabled' }}</td>
            </ng-container>


            <!-- Created -->
            <ng-container matColumnDef="createdAt">
              <th mat-header-cell *matHeaderCellDef>
                Created
              </th>

              <td mat-cell *matCellDef="let d">
                {{ d.createdAt | date: 'd MMM y' }}
              </td>
            </ng-container>


            <!-- Actions -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>
                Actions
              </th>

              <td mat-cell *matCellDef="let d">

                <a mat-button [routerLink]="['/admin/doctors', d.id, 'availability']">{{ d.scheduleConfigured ? 'Schedule' : 'Configure schedule' }}</a>

                <button
                  mat-icon-button
                  color="primary"
                  aria-label="Edit doctor"
                  (click)="openEdit(d)">
                  <mat-icon>edit</mat-icon>
                </button>

                <button
                  mat-icon-button
                  color="warn"
                  aria-label="Delete doctor"
                  (click)="remove(d)">
                  <mat-icon>delete</mat-icon>
                </button>
                <button mat-button type="button" [color]="d.active ? 'warn' : 'primary'"
                  (click)="setStatus(d)">{{ d.active ? 'Disable' : 'Enable' }}</button>

              </td>
            </ng-container>


            <tr
              mat-header-row
              *matHeaderRowDef="columns">
            </tr>

            <tr
              mat-row
              *matRowDef="let row; columns: columns">
            </tr>

          </table>

        </mat-card>

      }

    </div>
  `,

  styles: [`
    .form-card {
      margin-bottom: 20px;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    mat-form-field {
      min-width: 220px;
    }
  `]
})
export class ManageDoctorsComponent implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly doctorService = inject(DoctorService);
  private readonly specializationService = inject(SpecializationService);
  private readonly snackBar = inject(MatSnackBar);


  readonly columns = [
    'id',
    'name',
    'email',
    'specialization',
    'status',
    'createdAt',
    'actions'
  ];


  readonly doctors = signal<Doctor[]>([]);

  readonly specializations =
    signal<Specialization[]>([]);

  readonly loading = signal(true);

  readonly error =
    signal<string | null>(null);

  readonly formOpen =
    signal(false);

  readonly editingId =
    signal<number | null>(null);

  readonly saving =
    signal(false);

  readonly formError =
    signal<string | null>(null);


  readonly form = this.fb.nonNullable.group({

    name: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(100)
      ]
    ],

    email: [
      '',
      [
        Validators.required,
        Validators.email
      ]
    ],

    password: [
      '',
      [
        Validators.minLength(6)
      ]
    ],

    specializationId: [
      null as number | null,
      [
        Validators.required
      ]
    ]

  });


  ngOnInit(): void {
    this.load();
    this.loadSpecializations();
  }


  openCreate(): void {

    this.editingId.set(null);

    this.form.reset({
      name: '',
      email: '',
      password: '',
      specializationId: null
    });

    this.form.controls.password.setValidators([
      Validators.required,
      Validators.minLength(6)
    ]);

    this.form.controls.password.updateValueAndValidity();

    this.formError.set(null);

    this.formOpen.set(true);
  }


  openEdit(doctor: Doctor): void {

    this.editingId.set(doctor.id);

    this.form.reset({
      name: doctor.name,
      email: doctor.email,
      password: '',
      specializationId: doctor.specializationId
    });

    /*
     * Password is not required when editing.
     */
    this.form.controls.password.clearValidators();

    this.form.controls.password.updateValueAndValidity();

    this.formError.set(null);

    this.formOpen.set(true);
  }


  closeForm(): void {

    this.formOpen.set(false);

    this.editingId.set(null);

    this.formError.set(null);
  }


  save(): void {

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);

    this.formError.set(null);

    const raw = this.form.getRawValue();

    const id = this.editingId();


    /*
     * Create doctor
     */
    if (!id) {

      const payload: DoctorRequest = {
        name: raw.name,
        email: raw.email,
        password: raw.password,
        specializationId: raw.specializationId!
      };

      this.doctorService.create(payload).subscribe({

        next: () => {

          this.snackBar.open(
            'Doctor added',
            'OK',
            { duration: 3000 }
          );

          this.saving.set(false);

          this.closeForm();

          this.load();
        },

        error: (err) => {

          this.formError.set(
            extractErrorMessage(err)
          );

          this.saving.set(false);
        }

      });

      return;
    }


    /*
     * Update doctor
     */
    const payload: DoctorRequest = {
      name: raw.name,
      email: raw.email,

      /*
       * Your current DoctorRequest requires password.
       * For an update, keep the existing password value empty
       * unless your backend specifically requires a new password.
       */
      password: raw.password || '',

      specializationId: raw.specializationId!
    };


    this.doctorService.update(id, payload).subscribe({

      next: () => {

        this.snackBar.open(
          'Doctor updated',
          'OK',
          { duration: 3000 }
        );

        this.saving.set(false);

        this.closeForm();

        this.load();
      },

      error: (err) => {

        this.formError.set(
          extractErrorMessage(err)
        );

        this.saving.set(false);
      }

    });

  }


  remove(doctor: Doctor): void {

    const ok = confirm(
      `Delete ${doctor.name}? All appointments with this doctor will also be removed.`
    );

    if (!ok) {
      return;
    }

    this.doctorService.delete(doctor.id).subscribe({

      next: () => {

        this.snackBar.open(
          'Doctor deleted',
          'OK',
          { duration: 3000 }
        );

        this.load();
      },

      error: (err) => {

        this.snackBar.open(
          extractErrorMessage(err),
          'Close',
          { duration: 5000 }
        );

      }

    });

  }

  setStatus(doctor: Doctor): void {
    const active = !doctor.active;
    this.doctorService.updateStatus(doctor.id, active).subscribe({
      next: updated => {
        this.doctors.update(rows => rows.map(row => row.id === updated.id ? updated : row));
        this.snackBar.open(`Doctor account ${active ? 'enabled' : 'disabled'}`, 'OK', { duration: 2500 });
      },
      error: err => this.snackBar.open(extractErrorMessage(err), 'Close', { duration: 5000 })
    });
  }


  private load(): void {

    this.doctorService.getAll(true).subscribe({

      next: (list) => {

        this.doctors.set(list);

        this.loading.set(false);
      },

      error: (err) => {

        this.error.set(
          extractErrorMessage(err)
        );

        this.loading.set(false);
      }

    });

  }


  private loadSpecializations(): void {

    this.specializationService.getAll().subscribe({

      next: (list) => {

        this.specializations.set(list);
      },

      error: (err) => {

        this.formError.set(
          extractErrorMessage(err)
        );

      }

    });

  }

}
