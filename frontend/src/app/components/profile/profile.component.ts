import { Component, Inject, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormsModule, ReactiveFormsModule, FormBuilder, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DATE_FORMATS, MAT_DATE_LOCALE, DateAdapter, MatNativeDateModule, NativeDateAdapter } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';
import { DoctorService } from '../../core/services/doctor.service';
import { SpecializationService } from '../../core/services/specialization.service';
import { Doctor } from '../../core/models/doctor.model';
import { Specialization } from '../../core/models/specialization.model';
import { Profile } from '../../core/models/profile.model';
import { extractErrorMessage } from '../../core/services/error-message';
import { WorkflowService } from '../../core/services/workflow.service';
import { FeeChangeRequest, DoctorLeave } from '../../core/models/workflow.model';
import { CountryCode, getCountries, getCountryCallingCode, isValidPhoneNumber, parsePhoneNumberFromString } from 'libphonenumber-js/max';

const REGION_NAMES = new Intl.DisplayNames(['en'], { type: 'region' });
const leaveDateRangeValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const start = control.get('startDate')?.value as Date | null;
  const end = control.get('endDate')?.value as Date | null;
  return start && end && end < start ? { dateRange: true } : null;
};

const DD_MM_YYYY_FORMATS = {
  parse: { dateInput: 'dateInput' },
  display: {
    dateInput: 'dateInput',
    monthYearLabel: { year: 'numeric', month: 'short' },
    dateA11yLabel: { year: 'numeric', month: 'long', day: 'numeric' },
    monthYearA11yLabel: { year: 'numeric', month: 'long' }
  }
};

class DdMmYyyyDateAdapter extends NativeDateAdapter {
  constructor(@Inject(MAT_DATE_LOCALE) locale: string) {
    super(locale);
  }

  override parse(value: unknown): Date | null {
    if (value instanceof Date) return this.isValid(value) ? this.clone(value) : null;
    if (typeof value !== 'string' || !value.trim()) return null;
    const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
    if (!match) return null;
    const day = Number(match[1]);
    const month = Number(match[2]) - 1;
    const year = Number(match[3]);
    try {
      return this.createDate(year, month, day);
    } catch {
      return null;
    }
  }

  override format(date: Date, displayFormat: Object): string {
    if (displayFormat === 'dateInput') {
      const day = String(this.getDate(date)).padStart(2, '0');
      const month = String(this.getMonth(date) + 1).padStart(2, '0');
      return `${day}/${month}/${this.getYear(date)}`;
    }
    return super.format(date, displayFormat);
  }
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    FormsModule, ReactiveFormsModule, CurrencyPipe, DecimalPipe, DatePipe, MatSelectModule, MatCardModule,
    MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatDatepickerModule, MatNativeDateModule
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' },
    {
      provide: DateAdapter,
      useClass: DdMmYyyyDateAdapter,
      deps: [MAT_DATE_LOCALE]
    },
    { provide: MAT_DATE_FORMATS, useValue: DD_MM_YYYY_FORMATS }
  ],
  template: `
    <div class="page profile-page">
      <div class="page-title">
        <div>
          <h1>{{ roleTitle(profile()?.role ?? '') }}</h1>
          <p class="muted">Manage your account details and security.</p>
        </div>
        <button mat-stroked-button type="button" (click)="auth.logout()">
          <mat-icon>logout</mat-icon> Logout
        </button>
      </div>

      @if (profile(); as user) {
        <div class="profile-grid">
          <mat-card>
            <mat-card-header><mat-card-title>Personal details</mat-card-title></mat-card-header>
            <mat-card-content>
              <div class="identity">
              <input #photoInput class="visually-hidden" type="file" accept="image/png,image/jpeg,image/gif,image/webp"
                (change)="selectPhoto($event)" aria-label="Choose a profile photo">
              @if (photoPreview() || user.profilePhotoUrl) {
                <div class="photo-control">
                  <button class="photo-preview-button" type="button" aria-label="View profile photo enlarged"
                    (click)="openPhotoLightbox()">
                    <img class="avatar" [src]="photoPreview() || profilePhotoSource(user.profilePhotoUrl)" alt="Profile photo" referrerpolicy="no-referrer">
                  </button>
                  <button class="photo-edit" type="button" aria-label="Edit profile photo" (click)="photoInput.click()">
                    <mat-icon>photo_camera</mat-icon>
                  </button>
                  @if (selectedPhoto()) {
                    <div class="photo-save">
                      <span class="muted photo-name">{{ selectedPhoto()?.name }}</span>
                      <button mat-flat-button color="primary" type="button" (click)="savePhoto()" [disabled]="savingPhoto()">
                        @if (savingPhoto()) { <mat-spinner diameter="18" /> } @else { Save photo }
                      </button>
                    </div>
                  }
                </div>
              } @else {
                <button mat-stroked-button type="button" (click)="photoInput.click()">
                  <mat-icon>photo_camera</mat-icon> Choose Photo
                </button>
              }
              <div><strong>{{ user.name }}</strong><div class="muted">{{ roleLabel(user.role) }}</div></div>
            </div>
              <form [formGroup]="profileForm" (ngSubmit)="saveProfile()">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Name</mat-label><input matInput formControlName="name" autocomplete="name">
                </mat-form-field>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Email</mat-label><input matInput type="email" formControlName="email" autocomplete="email">
                </mat-form-field>
                @if (profileError()) { <div class="error-banner">{{ profileError() }}</div> }
                <button mat-flat-button color="primary" type="submit" [disabled]="savingProfile()">
                  @if (savingProfile()) { <mat-spinner diameter="18" /> } @else { Save profile }
                </button>
              </form>
              <div class="password-action">
                <div><strong>Account security</strong><div class="muted">Keep your account protected with a strong password.</div></div>
                <button mat-stroked-button color="primary" type="button" (click)="openPasswordModal()">
                  <mat-icon>lock_reset</mat-icon> Change password
                </button>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        @if (passwordModalOpen()) {
          <div class="modal-backdrop" (click)="closePasswordModal()" (keydown.escape)="closePasswordModal()">
            <section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="password-modal-title" (click)="$event.stopPropagation()">
              <div class="modal-heading">
                <div class="modal-icon"><mat-icon>shield</mat-icon></div>
                <button mat-icon-button type="button" aria-label="Close change password" (click)="closePasswordModal()" [disabled]="changingPassword()">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
              <h2 id="password-modal-title">Change password</h2>
              <p class="muted">Choose a new password you haven't used before.</p>
              <form [formGroup]="passwordForm" (ngSubmit)="changePassword()">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Current password</mat-label>
                  <input matInput [type]="passwordVisibility().current ? 'text' : 'password'" formControlName="currentPassword" autocomplete="current-password">
                  <button mat-icon-button matSuffix type="button" [attr.aria-label]="passwordVisibility().current ? 'Hide current password' : 'Show current password'"
                    (click)="togglePasswordVisibility('current')"><mat-icon>{{ passwordVisibility().current ? 'visibility_off' : 'visibility' }}</mat-icon></button>
                  @if (passwordForm.controls.currentPassword.touched && passwordForm.controls.currentPassword.hasError('required')) { <mat-error>Enter your current password.</mat-error> }
                </mat-form-field>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>New password</mat-label>
                  <input matInput [type]="passwordVisibility().new ? 'text' : 'password'" formControlName="newPassword" autocomplete="new-password">
                  <button mat-icon-button matSuffix type="button" [attr.aria-label]="passwordVisibility().new ? 'Hide new password' : 'Show new password'"
                    (click)="togglePasswordVisibility('new')"><mat-icon>{{ passwordVisibility().new ? 'visibility_off' : 'visibility' }}</mat-icon></button>
                  <mat-hint>Use at least 8 characters.</mat-hint>
                  @if (passwordForm.controls.newPassword.touched && passwordForm.controls.newPassword.hasError('minlength')) { <mat-error>Use at least 8 characters.</mat-error> }
                  @if (passwordForm.controls.newPassword.touched && passwordForm.controls.newPassword.hasError('maxlength')) { <mat-error>Password must be 100 characters or fewer.</mat-error> }
                </mat-form-field>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Confirm new password</mat-label>
                  <input matInput [type]="passwordVisibility().confirm ? 'text' : 'password'" formControlName="confirmPassword" autocomplete="new-password">
                  <button mat-icon-button matSuffix type="button" [attr.aria-label]="passwordVisibility().confirm ? 'Hide confirmation' : 'Show confirmation'"
                    (click)="togglePasswordVisibility('confirm')"><mat-icon>{{ passwordVisibility().confirm ? 'visibility_off' : 'visibility' }}</mat-icon></button>
                  @if (passwordForm.controls.confirmPassword.touched && passwordForm.controls.newPassword.value !== passwordForm.controls.confirmPassword.value) {
                    <mat-error>Passwords do not match.</mat-error>
                  }
                  @if (passwordForm.controls.confirmPassword.touched && passwordForm.controls.confirmPassword.hasError('required')) { <mat-error>Confirm your new password.</mat-error> }
                </mat-form-field>
                @if (passwordError()) { <div class="error-banner" role="alert">{{ passwordError() }}</div> }
                <div class="modal-actions">
                  <button mat-button type="button" (click)="closePasswordModal()" [disabled]="changingPassword()">Cancel</button>
                  <button mat-flat-button color="primary" type="submit" [disabled]="changingPassword()">
                    @if (changingPassword()) { <mat-spinner diameter="18" /> } @else { Update password }
                  </button>
                </div>
              </form>
            </section>
          </div>
        }

        @if (photoLightboxOpen() && (photoPreview() || user.profilePhotoUrl)) {
          <div class="photo-lightbox" (click)="closePhotoLightbox()" (keydown.escape)="closePhotoLightbox()">
            <section class="lightbox-content" role="dialog" aria-modal="true" aria-label="Profile photo" (click)="$event.stopPropagation()">
              <button mat-icon-button class="lightbox-close" type="button" aria-label="Close enlarged profile photo"
                (click)="closePhotoLightbox()">
                <mat-icon>close</mat-icon>
              </button>
              <img [src]="photoPreview() || profilePhotoSource(user.profilePhotoUrl)" alt="Enlarged profile photo" referrerpolicy="no-referrer">
            </section>
          </div>
        }

        @if (user.role === 'DOCTOR') {
          <mat-card class="detail-card">
            <mat-card-header><mat-card-title>Practice details</mat-card-title></mat-card-header>
            <mat-card-content>
              <div class="doctor-details">
                <div><span class="muted">Specialization</span><strong>{{ user.specialization || 'Not set' }}</strong></div>
                <div><span class="muted">Consultation fee</span>
                  <strong>{{ user.consultationFee === null ? 'Not configured' : (user.consultationFee | currency:'INR':'symbol':'1.2-2') }}</strong>
                </div>
                <div><span class="muted">Patient rating</span><strong>{{ user.averageRating === null ? 'No approved reviews' : (user.averageRating | number:'1.1-1') + ' / 5 (' + user.reviewCount + ')' }}</strong></div>
              </div>
              <form [formGroup]="practiceForm" (ngSubmit)="savePractice()" class="practice-form">
                <mat-form-field appearance="outline" class="full-width"><mat-label>Professional bio</mat-label><textarea matInput rows="3" formControlName="bio"></textarea></mat-form-field>
                <mat-form-field appearance="outline" class="full-width"><mat-label>Qualifications</mat-label><input matInput formControlName="qualifications" placeholder="MBBS, MD"></mat-form-field>
                <div class="practice-row">
                  <mat-form-field appearance="outline"><mat-label>Experience (years)</mat-label><input matInput type="number" min="0" max="80" formControlName="experienceYears"></mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Country code</mat-label>
                    <mat-select formControlName="phoneCountry" (selectionChange)="practiceForm.controls.phone.updateValueAndValidity()">
                      @for (item of phoneCountries; track item.country) {
                        <mat-option [value]="item.country">{{ item.name }} (+{{ item.callingCode }})</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Contact phone</mat-label>
                    <input matInput type="tel" inputmode="tel" formControlName="phone">
                    @if (practiceForm.controls.phone.touched && practiceForm.controls.phone.hasError('invalidPhone')) {
                      <mat-error>Enter a valid phone number for the selected country code.</mat-error>
                    }
                  </mat-form-field>
                </div>
                <button mat-flat-button color="primary" type="submit" [disabled]="savingPractice()">Save professional details</button>
              </form>
              <h3>Availability Settings / Weekly Schedule</h3>
              <form [formGroup]="scheduleForm" (ngSubmit)="addSchedule()" class="practice-row">
                <mat-form-field appearance="outline"><mat-label>Weekday</mat-label><mat-select formControlName="dayOfWeek">
                  @for (day of days; track day) { <mat-option [value]="day">{{ day }}</mat-option> }
                </mat-select></mat-form-field>
                <mat-form-field appearance="outline"><mat-label>Start time</mat-label><input matInput type="time" formControlName="startTime"></mat-form-field>
                <mat-form-field appearance="outline"><mat-label>End time</mat-label><input matInput type="time" formControlName="endTime"></mat-form-field>
                <mat-form-field appearance="outline"><mat-label>Appointment duration (minutes)</mat-label><input matInput type="number" min="15" max="120" step="15" formControlName="slotDurationMinutes"></mat-form-field>
                <button mat-flat-button color="primary" type="submit">{{ editingScheduleId() ? 'Update schedule' : 'Add schedule' }}</button>
                @if (editingScheduleId()) { <button mat-button type="button" (click)="cancelScheduleEdit()">Cancel edit</button> }
              </form>
              @if (user.schedule.length) {
                <div class="schedule-list">
                  @for (item of user.schedule; track item.id) {
                    <div class="schedule-row">
                      <strong>{{ item.dayOfWeek }}</strong>
                      <span>{{ formatTime(item.startTime) }}–{{ formatTime(item.endTime) }}</span>
                      <span class="muted">{{ item.slotDurationMinutes }}-minute appointments</span>
                      <button mat-button type="button" (click)="editSchedule(item)">Edit</button>
                      <button mat-button color="warn" type="button" (click)="removeSchedule(item.id)">Remove</button>
                    </div>
                  }
                </div>
              } @else { <p class="muted">No availability has been configured yet.</p> }
              <h3>Request leave</h3>
              <form [formGroup]="leaveForm" (ngSubmit)="addLeave()" class="practice-row">
                <mat-form-field appearance="outline">
                  <mat-label>From</mat-label>
                  <input matInput placeholder="DD/MM/YYYY" [min]="minLeaveDate" [matDatepicker]="leaveStartPicker" formControlName="startDate">
                  <mat-datepicker-toggle matIconSuffix [for]="leaveStartPicker"></mat-datepicker-toggle>
                  <mat-datepicker #leaveStartPicker></mat-datepicker>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>To</mat-label>
                  <input matInput placeholder="DD/MM/YYYY" [min]="leaveForm.controls.startDate.value || minLeaveDate" [matDatepicker]="leaveEndPicker" formControlName="endDate">
                  <mat-datepicker-toggle matIconSuffix [for]="leaveEndPicker"></mat-datepicker-toggle>
                  <mat-datepicker #leaveEndPicker></mat-datepicker>
                  @if (leaveForm.hasError('dateRange') && leaveForm.controls.endDate.touched) { <mat-error>End date must be on or after the start date.</mat-error> }
                </mat-form-field>
                <mat-form-field appearance="outline"><mat-label>Reason (optional)</mat-label><input matInput maxlength="500" formControlName="reason">
                  @if (leaveForm.controls.reason.touched && leaveForm.controls.reason.hasError('maxlength')) { <mat-error>Use 500 characters or fewer.</mat-error> }
                </mat-form-field>
                <button mat-flat-button color="primary" type="submit">Submit leave request</button>
              </form>
              <div class="schedule-list">@for (leave of leaves(); track leave.id) {
                <div class="schedule-row"><strong>{{ formatLeaveDate(leave.startDate) }} – {{ formatLeaveDate(leave.endDate) }}</strong>
                  <span>{{ leave.reason || 'No reason provided' }}</span><span>{{ leave.status }}</span>
                  @if (leave.adminComment) { <span class="muted">Admin: {{ leave.adminComment }}</span> }
                  @if (leave.status === 'PENDING') { <button mat-button color="warn" (click)="removeLeave(leave.id)">Remove request</button> }
                </div>
              } @empty { <p class="muted">No leave requests yet.</p> }</div>
              <h3>Request a consultation-fee change</h3>
              <p class="muted">Current fee remains in effect until an administrator approves your proposal.</p>
              <form [formGroup]="feeRequestForm" (ngSubmit)="requestFee()" class="practice-row">
                <mat-form-field appearance="outline"><mat-label>Proposed fee (INR)</mat-label><input matInput type="number" min="0.01" step="0.01" formControlName="proposedFee"></mat-form-field>
                <mat-form-field appearance="outline" class="full-width"><mat-label>Reason</mat-label><textarea matInput rows="2" formControlName="reason"></textarea></mat-form-field>
                <button mat-flat-button color="primary" type="submit">Submit request</button>
              </form>
              <div class="schedule-list">@for (request of feeRequests(); track request.id) {
                <div class="schedule-row"><strong>{{ request.status }}</strong><span>{{ request.proposedFee | currency:'INR':'symbol':'1.2-2' }} · {{ request.reason }}</span>
                  @if (request.adminComment) { <span class="muted">Admin: {{ request.adminComment }}</span> }
                </div>
              }</div>
            </mat-card-content>
          </mat-card>
        }

        @if (user.role === 'ADMIN') {
          <mat-card class="detail-card">
            <mat-card-header><mat-card-title>Doctor fee-change requests</mat-card-title></mat-card-header>
            <mat-card-content><div class="schedule-list">@for (request of feeRequests(); track request.id) {
              <div class="schedule-row request-row">
                <div><strong>{{ request.doctorName }} · {{ request.proposedFee | currency:'INR':'symbol':'1.2-2' }}</strong><div>{{ request.reason }}</div>
                  <small class="muted">{{ request.status }} · {{ request.createdAt | date:'medium' }}</small>
                </div>
                @if (request.status === 'PENDING') {
                  <button mat-flat-button color="primary" (click)="decideFee(request,'APPROVED')">Approve</button>
                  <button mat-stroked-button color="warn" (click)="decideFee(request,'REJECTED')">Reject</button>
                }
                @if (request.adminComment) { <span class="muted">{{ request.adminComment }}</span> }
              </div>
            } @empty { <p class="muted">No fee-change requests.</p> }</div></mat-card-content>
          </mat-card>

          <mat-card class="detail-card">
            <mat-card-header><mat-card-title>Specialization fee defaults</mat-card-title></mat-card-header>
            <mat-card-content>
              <p class="muted">Set the default INR consultation fee. Doctors can have an individual fee override.</p>
              @if (loadingFees()) { <mat-spinner diameter="28" /> }
              @else {
                <div class="fee-list">
                  @for (item of specializations(); track item.id) {
                    <div class="fee-row">
                      <strong>{{ item.name }}</strong>
                      <mat-form-field appearance="outline" subscriptSizing="dynamic">
                        <mat-label>Fee (INR)</mat-label>
                        <input matInput type="number" min="0.01" step="0.01"
                          [ngModel]="specializationDrafts()[item.id]"
                          [ngModelOptions]="{standalone:true}"
                          (ngModelChange)="setSpecializationDraft(item.id, $event)">
                      </mat-form-field>
                      <button mat-stroked-button color="primary" type="button"
                        (click)="saveSpecializationFee(item)" [disabled]="busyFee() === 's' + item.id">Save fee</button>
                    </div>
                  }
                </div>
              }
            </mat-card-content>
          </mat-card>

          <mat-card class="detail-card">
            <mat-card-header><mat-card-title>Doctor fee overrides</mat-card-title></mat-card-header>
            <mat-card-content>
              <p class="muted">Each doctor uses their specialization default unless an individual fee is set.</p>
              @if (loadingFees()) { <mat-spinner diameter="28" /> }
              @else {
                <div class="fee-list">
                  @for (item of doctors(); track item.id) {
                    <div class="fee-row doctor-fee">
                      <div><strong>{{ item.name }}</strong><span class="muted">{{ item.specialization }} · Current: {{ item.consultationFee === null ? 'Not set' : (item.consultationFee | currency:'INR':'symbol':'1.2-2') }}</span></div>
                      <mat-form-field appearance="outline" subscriptSizing="dynamic">
                        <mat-label>Fee (INR)</mat-label>
                        <input matInput type="number" min="0.01" step="0.01"
                          [ngModel]="doctorFeeDrafts()[item.id]"
                          [ngModelOptions]="{standalone:true}"
                          (ngModelChange)="setDoctorDraft(item.id, $event)">
                      </mat-form-field>
                      <button mat-stroked-button color="primary" type="button"
                        (click)="saveDoctorFee(item)" [disabled]="busyFee() === 'd' + item.id">Save fee</button>
                      <button mat-button type="button" (click)="inheritSpecializationFee(item)"
                        [disabled]="busyFee() === 'd' + item.id">Use default</button>
                    </div>
                  }
                </div>
              }
            </mat-card-content>
          </mat-card>
        }
      } @else if (loading()) {
        <div class="empty-state"><mat-spinner diameter="40" /></div>
      } @else if (error()) {
        <div class="error-banner" role="alert">{{ error() }}</div>
      }
    </div>
  `,
  styles: [`
    .profile-page{max-width:1100px}.profile-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px}
    .identity{display:flex;align-items:center;gap:14px;margin:18px 0}.avatar{width:68px;height:68px;border-radius:50%;object-fit:cover;background:#e0f2f1}
    .photo-control{position:relative;flex:0 0 auto}.photo-preview-button{display:block;width:68px;height:68px;border:0;padding:0;border-radius:50%;background:transparent;cursor:zoom-in}
    .photo-preview-button:focus-visible,.photo-edit:focus-visible{outline:2px solid var(--mc-primary);outline-offset:3px}
    .photo-edit{position:absolute;right:-3px;bottom:-2px;width:27px;height:27px;border:2px solid #fff;border-radius:50%;display:grid;place-items:center;background:#edf5f4;color:var(--mc-primary);cursor:pointer;box-shadow:0 2px 8px #18353b26;transition:background .15s ease,transform .15s ease}
    .photo-edit:hover{background:#dcefeb;transform:scale(1.05)}.photo-edit mat-icon{font-size:16px;width:16px;height:16px}
    .photo-save{position:absolute;top:calc(100% + 8px);left:50%;z-index:2;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:6px;padding:9px;background:#fff;border:1px solid #e4eceb;border-radius:12px;box-shadow:0 8px 24px #18353b18}
    .photo-name{max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}
    .photo-lightbox{position:fixed;inset:0;z-index:1100;background:rgba(12,24,30,.82);backdrop-filter:blur(5px);display:grid;place-items:center;padding:24px}
    .lightbox-content{position:relative;max-width:min(90vw,900px);max-height:90vh;padding:10px;background:#fff;border-radius:18px;box-shadow:0 24px 80px #0005}
    .lightbox-content img{display:block;max-width:calc(90vw - 20px);max-height:calc(90vh - 20px);object-fit:contain;border-radius:12px}
    .lightbox-close{position:absolute;top:16px;right:16px;z-index:1;background:#ffffffdf;color:#20343a}
    .full-width{width:100%}.muted{color:var(--mc-muted)}.detail-card{margin-top:20px}.doctor-details{display:flex;gap:44px}
    .doctor-details>div{display:flex;flex-direction:column;gap:6px}.schedule-list,.fee-list{display:grid;gap:10px;margin-top:14px}
    .schedule-row,.fee-row{display:flex;align-items:center;gap:14px;padding:12px;border-radius:9px;background:#f5f8f8}
    .schedule-row strong{min-width:115px}.fee-row>strong,.fee-row>div:first-child{flex:1}.doctor-fee>div:first-child{display:flex;flex-direction:column;gap:4px}
    .fee-row mat-form-field{width:145px}.page-title{align-items:center}
    .visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    .photo-actions,.password-action{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 20px}
    .photo-name{max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .password-action{justify-content:space-between;border-top:1px solid #e7eeee;padding-top:18px;margin:20px 0 0}
    .modal-backdrop{position:fixed;inset:0;z-index:1000;background:rgba(12,30,38,.58);backdrop-filter:blur(5px);display:grid;place-items:center;padding:20px}
    .modal-card{width:min(100%,480px);max-height:calc(100vh - 40px);overflow:auto;background:#fff;border-radius:20px;padding:26px;box-shadow:0 24px 80px rgba(10,35,45,.25)}
    .modal-heading{display:flex;justify-content:space-between;align-items:center}.modal-icon{width:48px;height:48px;border-radius:15px;background:#e7f5f3;color:var(--mc-primary);display:grid;place-items:center}
    .modal-card h2{margin:18px 0 4px}.modal-card>p{margin:0 0 20px}.modal-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:8px}
    @media(max-width:700px){.fee-row{flex-wrap:wrap}.fee-row>strong,.fee-row>div:first-child{flex-basis:100%}.doctor-details{flex-direction:column;gap:15px}.modal-card{padding:20px}.password-action{align-items:flex-start;flex-direction:column}}
  `]
})
export class ProfileComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly profilesApi = inject(ProfileService);
  private readonly doctorsApi = inject(DoctorService);
  private readonly specializationsApi = inject(SpecializationService);
  private readonly workflow = inject(WorkflowService);
  private readonly snackBar = inject(MatSnackBar);
  readonly auth = inject(AuthService);

  readonly profile = signal<Profile | null>(null);
  readonly doctors = signal<Doctor[]>([]);
  readonly specializations = signal<Specialization[]>([]);
  readonly feeRequests = signal<FeeChangeRequest[]>([]);
  readonly leaves = signal<DoctorLeave[]>([]);
  readonly editingScheduleId = signal<number | null>(null);
  readonly days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  readonly phoneCountries = getCountries().map(country => ({
    country,
    name: REGION_NAMES.of(country) ?? country,
    callingCode: getCountryCallingCode(country)
  })).sort((left, right) => left.name.localeCompare(right.name));
  readonly specializationDrafts = signal<Record<number, string>>({});
  readonly doctorFeeDrafts = signal<Record<number, string>>({});
  readonly loading = signal(true);
  readonly loadingFees = signal(false);
  readonly savingProfile = signal(false);
  readonly selectedPhoto = signal<File | null>(null);
  readonly photoPreview = signal<string | null>(null);
  readonly photoLightboxOpen = signal(false);
  readonly savingPhoto = signal(false);
  readonly passwordModalOpen = signal(false);
  readonly passwordVisibility = signal({ current: false, new: false, confirm: false });
  readonly changingPassword = signal(false);
  readonly savingPractice = signal(false);
  readonly profileError = signal<string | null>(null);
  readonly passwordError = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly busyFee = signal<string | null>(null);
  readonly isAdmin = () => this.profile()?.role === 'ADMIN';

  private readonly phoneValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    if (!value) return null;
    const country = control.parent?.get('phoneCountry')?.value as CountryCode | undefined;
    if (!country || value.startsWith('+') || !isValidPhoneNumber(value, country)) return { invalidPhone: true };
    return null;
  };

  readonly profileForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]]
  });
  readonly practiceForm = this.fb.group({
    bio: [''], qualifications: [''], experienceYears: [null as number | null, [Validators.min(0), Validators.max(80)]],
    phoneCountry: ['IN' as CountryCode, Validators.required],
    phone: ['', [Validators.maxLength(30), this.phoneValidator]]
  });
  readonly scheduleForm = this.fb.nonNullable.group({
    dayOfWeek: ['MONDAY', Validators.required], startTime: ['09:00', Validators.required],
    endTime: ['17:00', Validators.required], slotDurationMinutes: [30, [Validators.min(15), Validators.max(120)]]
  });
  readonly leaveForm = this.fb.nonNullable.group({
    startDate: [null as Date | null, Validators.required], endDate: [null as Date | null, Validators.required],
    reason: ['', Validators.maxLength(500)]
  }, { validators: leaveDateRangeValidator });
  readonly minLeaveDate = this.todayDate();
  readonly feeRequestForm = this.fb.nonNullable.group({
    proposedFee: [0, [Validators.required, Validators.min(0.01)]], reason: ['', [Validators.required, Validators.maxLength(1000)]]
  });

  readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(100)]],
    confirmPassword: ['', Validators.required]
  });

  ngOnInit(): void {
    this.profilesApi.getMine().subscribe({
      next: profile => {
        this.profile.set(profile);
        this.profileForm.patchValue({
          name: profile.name,
          email: profile.email
        });
        this.practiceForm.patchValue({
          bio: profile.bio ?? '', qualifications: profile.qualifications ?? '',
          experienceYears: profile.experienceYears,
          phoneCountry: this.phoneCountryFor(profile.phone),
          phone: this.nationalPhoneNumber(profile.phone)
        });
        this.practiceForm.controls.phone.updateValueAndValidity();
        this.loading.set(false);
        if (profile.role === 'ADMIN') this.loadFees();
        if (profile.role === 'DOCTOR') {
          this.workflow.myFeeRequests().subscribe({ next: rows => this.feeRequests.set(rows), error: err => this.error.set(extractErrorMessage(err)) });
          this.workflow.myLeaves().subscribe({ next: rows => this.leaves.set(rows), error: err => this.error.set(extractErrorMessage(err)) });
        }
      },
      error: err => {
        this.error.set(extractErrorMessage(err));
        this.loading.set(false);
      }
    });
  }

  ngOnDestroy(): void {
    this.clearPhotoPreview();
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    this.savingProfile.set(true);
    this.profileError.set(null);
    this.profilesApi.updateMine({
      ...this.profileForm.getRawValue(),
      profilePhotoUrl: null
    }).subscribe({
      next: result => {
        this.profile.set(result.profile);
        this.auth.updateSession(result.session);
        this.profileForm.patchValue({
          name: result.profile.name,
          email: result.profile.email
        });
        this.snackBar.open('Profile updated', 'OK', { duration: 2500 });
        this.savingProfile.set(false);
      },
      error: err => {
        this.profileError.set(extractErrorMessage(err));
        this.savingProfile.set(false);
      }
    });
  }

  profilePhotoSource(value: string | null): string {
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    return new URL(value, this.profilesApi.photoBaseUrl()).toString();
  }

  openPhotoLightbox(): void { this.photoLightboxOpen.set(true); }
  closePhotoLightbox(): void { this.photoLightboxOpen.set(false); }

  selectPhoto(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const file = input.files?.[0];
    if (!file) return;
    const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type) || file.size > 5 * 1024 * 1024) {
      this.snackBar.open('Choose a PNG, JPEG, GIF, or WebP image up to 5 MB.', 'Close', { duration: 4000 });
      input.value = '';
      return;
    }
    this.clearPhotoPreview();
    this.selectedPhoto.set(file);
    this.photoPreview.set(URL.createObjectURL(file));
    input.value = '';
  }

  savePhoto(): void {
    const file = this.selectedPhoto();
    if (!file) return;
    this.savingPhoto.set(true);
    this.profilesApi.uploadPhoto(file).subscribe({
      next: profile => {
        this.profile.set(profile);
        this.auth.updateProfilePhoto(profile.profilePhotoUrl);
        this.clearPhotoPreview();
        this.snackBar.open('Profile photo updated', 'OK', { duration: 2500 });
        this.savingPhoto.set(false);
      },
      error: err => {
        this.snackBar.open(extractErrorMessage(err), 'Close', { duration: 5000 });
        this.savingPhoto.set(false);
      }
    });
  }

  openPasswordModal(): void {
    this.passwordError.set(null);
    this.passwordForm.reset();
    this.passwordVisibility.set({ current: false, new: false, confirm: false });
    this.passwordModalOpen.set(true);
  }

  closePasswordModal(): void {
    if (this.changingPassword()) return;
    this.passwordModalOpen.set(false);
    this.passwordError.set(null);
    this.passwordForm.reset();
  }

  togglePasswordVisibility(field: 'current' | 'new' | 'confirm'): void {
    this.passwordVisibility.update(state => ({ ...state, [field]: !state[field] }));
  }

  roleTitle(role: string): string {
    return role === 'ADMIN' ? 'Administrator Profile' : role === 'DOCTOR' ? 'Doctor Profile' : 'Patient Profile';
  }

  savePractice(): void {
    const user = this.profile();
    if (!user || user.role !== 'DOCTOR' || this.practiceForm.invalid) {
      this.practiceForm.markAllAsTouched();
      return;
    }
    const raw = this.practiceForm.getRawValue();
    const parsedPhone = raw.phone?.trim()
      ? parsePhoneNumberFromString(raw.phone.trim(), raw.phoneCountry as CountryCode)
      : undefined;
    this.savingPractice.set(true);
    this.profilesApi.updateDoctorDetails({
      bio: raw.bio ?? '',
      qualifications: raw.qualifications ?? '',
      experienceYears: raw.experienceYears ?? null,
      phone: parsedPhone?.number ?? ''
    }).subscribe({
      next: updated => {
        this.profile.set(updated);
        this.savingPractice.set(false);
        this.snackBar.open('Practice profile updated', 'OK', { duration: 2500 });
      },
      error: err => {
        this.error.set(extractErrorMessage(err));
        this.savingPractice.set(false);
      }
    });
  }

  addSchedule(): void {
    const doctorId = this.profile()?.doctorId;
    if (!doctorId || this.scheduleForm.invalid) {
      this.scheduleForm.markAllAsTouched();
      return;
    }
    const id = this.editingScheduleId();
    const request = this.scheduleForm.getRawValue();
    const operation = id ? this.workflow.updateSchedule(doctorId, id, request) : this.workflow.addSchedule(doctorId, request);
    operation.subscribe({
      next: () => this.refreshProfile(),
      error: err => this.snackBar.open(extractErrorMessage(err), 'Close', { duration: 5000 })
    });
  }

  editSchedule(item: Profile['schedule'][number]): void {
    this.editingScheduleId.set(item.id);
    this.scheduleForm.patchValue({
      dayOfWeek: item.dayOfWeek, startTime: item.startTime.substring(0, 5),
      endTime: item.endTime.substring(0, 5), slotDurationMinutes: item.slotDurationMinutes
    });
  }

  cancelScheduleEdit(): void {
    this.editingScheduleId.set(null);
    this.scheduleForm.reset({ dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30 });
  }

  removeSchedule(id: number): void {
    const doctorId = this.profile()?.doctorId;
    if (!doctorId) return;
    this.workflow.deleteSchedule(doctorId, id).subscribe({
      next: () => this.refreshProfile(),
      error: err => this.snackBar.open(extractErrorMessage(err), 'Close', { duration: 5000 })
    });
  }

  addLeave(): void {
    if (this.leaveForm.invalid) {
      this.leaveForm.markAllAsTouched();
      return;
    }
    const raw = this.leaveForm.getRawValue();
    this.workflow.addLeave({
      startDate: this.dateKey(raw.startDate!),
      endDate: this.dateKey(raw.endDate!),
      reason: raw.reason ?? ''
    }).subscribe({
      next: leave => {
        this.leaves.update(rows => [...rows, leave]);
        this.leaveForm.reset({ startDate: null, endDate: null, reason: '' });
        this.snackBar.open('Leave request submitted for admin approval', 'OK', { duration: 3000 });
      },
      error: err => this.snackBar.open(extractErrorMessage(err), 'Close', { duration: 5000 })
    });
  }

  removeLeave(id: number): void {
    this.workflow.deleteLeave(id).subscribe({
      next: () => this.leaves.update(rows => rows.filter(item => item.id !== id)),
      error: err => this.snackBar.open(extractErrorMessage(err), 'Close', { duration: 5000 })
    });
  }

  requestFee(): void {
    if (this.feeRequestForm.invalid) {
      this.feeRequestForm.markAllAsTouched();
      return;
    }
    const raw = this.feeRequestForm.getRawValue();
    this.workflow.requestFee(raw.proposedFee, raw.reason).subscribe({
      next: request => {
        this.feeRequests.update(rows => [request, ...rows]);
        this.feeRequestForm.reset({ proposedFee: 0, reason: '' });
      },
      error: err => this.snackBar.open(extractErrorMessage(err), 'Close', { duration: 5000 })
    });
  }

  decideFee(request: FeeChangeRequest, status: 'APPROVED' | 'REJECTED'): void {
    const comment = status === 'REJECTED' ? prompt('Enter a reason for rejecting this request:') : '';
    if (status === 'REJECTED' && (!comment || !comment.trim())) return;
    this.workflow.decideFee(request.id, status, comment ?? '').subscribe({
      next: updated => {
        this.feeRequests.update(rows => rows.map(row => row.id === updated.id ? updated : row));
        this.loadFees();
      },
      error: err => this.snackBar.open(extractErrorMessage(err), 'Close', { duration: 5000 })
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid
      || this.passwordForm.controls.newPassword.value !== this.passwordForm.controls.confirmPassword.value) {
      this.passwordForm.markAllAsTouched();
      this.passwordError.set('Enter matching passwords (at least 8 characters).');
      return;
    }
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.changingPassword.set(true);
    this.passwordError.set(null);
    this.profilesApi.changePassword({ currentPassword, newPassword }).subscribe({
      next: () => {
        this.passwordForm.reset();
        this.passwordModalOpen.set(false);
        this.snackBar.open('Password changed successfully', 'OK', { duration: 2500 });
        this.changingPassword.set(false);
      },
      error: err => {
        this.passwordError.set(extractErrorMessage(err));
        this.changingPassword.set(false);
      }
    });
  }

  setSpecializationDraft(id: number, value: string | number): void {
    this.specializationDrafts.update(values => ({ ...values, [id]: String(value) }));
  }

  setDoctorDraft(id: number, value: string | number): void {
    this.doctorFeeDrafts.update(values => ({ ...values, [id]: String(value) }));
  }

  saveSpecializationFee(item: Specialization): void {
    const amount = this.parseFee(this.specializationDrafts()[item.id]);
    if (amount === null) {
      this.snackBar.open('Enter a valid fee greater than zero with at most two decimal places.', 'Close', { duration: 4000 });
      return;
    }
    this.busyFee.set('s' + item.id);
    this.specializationsApi.updateFee(item.id, amount).subscribe({
      next: updated => {
        this.specializations.update(rows => rows.map(row => row.id === updated.id ? updated : row));
        this.snackBar.open(`${updated.name} default fee updated`, 'OK', { duration: 2500 });
        this.busyFee.set(null);
      },
      error: err => {
        this.snackBar.open(extractErrorMessage(err), 'Close', { duration: 5000 });
        this.busyFee.set(null);
      }
    });
  }

  saveDoctorFee(item: Doctor): void {
    const amount = this.parseFee(this.doctorFeeDrafts()[item.id]);
    if (amount === null) {
      this.snackBar.open('Enter a valid fee greater than zero with at most two decimal places.', 'Close', { duration: 4000 });
      return;
    }
    this.busyFee.set('d' + item.id);
    this.doctorsApi.updateFee(item.id, amount).subscribe({
      next: updated => {
        this.doctors.update(rows => rows.map(row => row.id === updated.id ? updated : row));
        this.snackBar.open(`${updated.name} fee updated`, 'OK', { duration: 2500 });
        this.busyFee.set(null);
      },
      error: err => {
        this.snackBar.open(extractErrorMessage(err), 'Close', { duration: 5000 });
        this.busyFee.set(null);
      }
    });
  }

  inheritSpecializationFee(item: Doctor): void {
    this.busyFee.set('d' + item.id);
    this.doctorsApi.useSpecializationFee(item.id).subscribe({
      next: updated => {
        this.doctors.update(rows => rows.map(row => row.id === updated.id ? updated : row));
        this.doctorFeeDrafts.update(values => ({ ...values, [updated.id]: String(updated.consultationFee ?? '') }));
        this.snackBar.open(`${updated.name} now uses the specialization default`, 'OK', { duration: 2500 });
        this.busyFee.set(null);
      },
      error: err => {
        this.snackBar.open(extractErrorMessage(err), 'Close', { duration: 5000 });
        this.busyFee.set(null);
      }
    });
  }

  formatTime(value: string): string {
    const [hourText, minutes] = value.split(':');
    const hour = Number(hourText);
    return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`;
  }

  roleLabel(role: string): string {
    return role === 'ADMIN' ? 'Administrator' : role === 'DOCTOR' ? 'Doctor' : 'Patient';
  }

  private loadFees(): void {
    this.loadingFees.set(true);
    forkJoin({
      doctors: this.doctorsApi.getAll(true),
      specializations: this.specializationsApi.getAll(),
      feeRequests: this.workflow.feeRequests()
    }).subscribe({
      next: result => {
        this.doctors.set(result.doctors);
        this.specializations.set(result.specializations);
        this.feeRequests.set(result.feeRequests);
        this.doctorFeeDrafts.set(result.doctors.reduce<Record<number, string>>(
          (drafts, doctor) => ({ ...drafts, [doctor.id]: doctor.consultationFee === null ? '' : String(doctor.consultationFee) }), {}));
        this.specializationDrafts.set(result.specializations.reduce<Record<number, string>>(
          (drafts, specialization) => ({ ...drafts, [specialization.id]: specialization.consultationFee === null ? '' : String(specialization.consultationFee) }), {}));
        this.loadingFees.set(false);
      },
      error: err => {
        this.error.set(extractErrorMessage(err));
        this.loadingFees.set(false);
      }
    });
  }

  private parseFee(value: string | undefined): number | null {
    if (!value?.trim() || !/^\d+(\.\d{1,2})?$/.test(value.trim())) return null;
    const amount = Number(value);
    return Number.isFinite(amount) && amount > 0 ? amount : null;
  }

  private dateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private todayDate(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  private phoneCountryFor(value: string | null): CountryCode {
    if (!value) return 'IN';
    return parsePhoneNumberFromString(value)?.country ?? 'IN';
  }

  private nationalPhoneNumber(value: string | null): string {
    if (!value) return '';
    const parsed = parsePhoneNumberFromString(value);
    return parsed?.nationalNumber ?? value.replace(/\D/g, '');
  }

  formatLeaveDate(value: string): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
  }

  private clearPhotoPreview(): void {
    const preview = this.photoPreview();
    if (preview) URL.revokeObjectURL(preview);
    this.photoPreview.set(null);
    this.selectedPhoto.set(null);
  }

  private refreshProfile(): void {
    this.profilesApi.getMine().subscribe({
      next: profile => { this.profile.set(profile); this.cancelScheduleEdit(); },
      error: err => this.error.set(extractErrorMessage(err))
    });
  }
}
