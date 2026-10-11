import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule, MatCalendarCellCssClasses } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Doctor } from '../../core/models/doctor.model';
import { Specialization } from '../../core/models/specialization.model';
import { PatientProfile, PatientRelationship } from '../../core/models/patient-profile.model';
import { AppointmentService, AvailableSlot } from '../../core/services/appointment.service';
import { DoctorService } from '../../core/services/doctor.service';
import { SpecializationService } from '../../core/services/specialization.service';
import { PatientProfileService } from '../../core/services/patient-profile.service';
import { AuthService } from '../../core/services/auth.service';
import { extractErrorMessage } from '../../core/services/error-message';

@Component({
  selector: 'app-book-appointment',
  standalone: true,
  imports: [CurrencyPipe, ReactiveFormsModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatProgressSpinnerModule,
    MatDatepickerModule, MatNativeDateModule, MatSnackBarModule],
  template: `
    <div class="page booking-page">
      <a mat-button routerLink="/doctors"><mat-icon>arrow_back</mat-icon> Back to doctors</a>
      <div class="booking-layout">
        <mat-card class="booking-card">
          <mat-card-header>
            <mat-card-title>Book an appointment</mat-card-title>
            @if (selectedDoctor(); as doc) { <mat-card-subtitle>{{ doc.name }} · {{ doc.specialization }}</mat-card-subtitle> }
            @else { <mat-card-subtitle>Choose a specialist and appointment time</mat-card-subtitle> }
          </mat-card-header>
          <mat-card-content>
            @if (error()) { <div class="error-banner" role="alert">{{ error() }}</div> }
            @if (selectedDoctor() && availabilityError()) {
              <button mat-button type="button" (click)="loadSlots(selectedDoctor()!)"><mat-icon>refresh</mat-icon> Retry availability</button>
            }
            @if (selectedSpecializationId() && !selectedDoctor() && error() && !loadingDoctors()) {
              <button mat-button type="button" (click)="specializationChanged(selectedSpecializationId()!)"><mat-icon>refresh</mat-icon> Retry doctor search</button>
            }
            @if (!specificDoctorMode()) {
              <section>
                <h2>1. Choose a specialty</h2>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Specialty</mat-label>
                  <mat-select [value]="selectedSpecializationId()" (selectionChange)="specializationChanged($event.value)">
                    @for (item of specializations(); track item.id) { <mat-option [value]="item.id">{{ item.name }}</mat-option> }
                  </mat-select>
                </mat-form-field>
                @if (loadingSpecializations()) { <div class="loading"><mat-spinner diameter="24" /> Loading specialties…</div> }
                @if (selectedSpecializationId()) {
                  <h2>2. Choose a doctor</h2>
                  @if (loadingDoctors()) { <div class="loading"><mat-spinner diameter="24" /> Looking for available doctors…</div> }
                  @if (!loadingDoctors() && !error() && doctors().length === 0) { <div class="empty">{{ doctorEmptyMessage() }}</div> }
                  <div class="doctors">
                    @for (doc of doctors(); track doc.id) {
                      <mat-card class="doctor-card"><mat-card-content>
                        <strong>{{ doc.name }}</strong><span>{{ doc.specialization }}</span>
                        <span class="fee-label">Consultation: {{ doc.consultationFee === null ? 'Not configured' : (doc.consultationFee | currency:'INR':'symbol':'1.2-2') }}</span>
                        <button mat-stroked-button color="primary" type="button" (click)="chooseDoctor(doc)">
                          {{ selectedDoctor()?.id === doc.id ? 'Selected' : 'View calendar' }}
                        </button>
                      </mat-card-content></mat-card>
                    }
                  </div>
                }
              </section>
            }

            @if (selectedDoctor()) {
              <section>
                <h2>{{ specificDoctorMode() ? 'Choose a date' : '3. Choose a date' }}</h2>
                @if (loadingSlots()) { <div class="loading"><mat-spinner diameter="24" /> Loading calendar availability…</div> }
            @if (slotsLoaded() && availableSlots().length === 0 && !availabilityError()) {
    <div class="empty">{{ slotEmptyMessage() }}
                    @if (!specificDoctorMode()) { <button mat-button type="button" (click)="selectedDoctor.set(null)">Choose another doctor</button> }
                    @else { <a mat-button routerLink="/doctors">Browse other doctors</a> }
                  </div>
                }
                @if (availableSlots().length > 0) {
                  <mat-form-field appearance="outline" class="full-width date-field">
                    <mat-label>Appointment date</mat-label>
                    <input matInput [matDatepicker]="calendar" [formControl]="dateControl"
                      [min]="minDate" [max]="maxDate" [matDatepickerFilter]="dateFilter"
                      (dateChange)="selectDate($event.value)" readonly>
                    <mat-datepicker-toggle matIconSuffix [for]="calendar" />
                    <mat-datepicker #calendar [dateClass]="dateClass" startView="month" />
                    <mat-hint>Dates with open appointments are highlighted. Booking is available for the next 90 days.</mat-hint>
                  </mat-form-field>
                }
                @if (selectedDate() && availableSlots().length > 0) {
                  <h3>Available times · {{ formatDateKey(dateKey(selectedDate()!)) }}</h3>
                  @if (dateSlots().length === 0) { <div class="empty">No appointments are available on this date. Choose a highlighted date.</div> }
                  <div class="time-slots">
                    @for (slot of dateSlots(); track slot.date + slot.time) {
                      <button type="button" class="time-chip" [class.selected]="selectedSlot()?.date === slot.date && selectedSlot()?.time === slot.time"
                        (click)="selectedSlot.set(slot)">{{ formatTime(slot.time) }}</button>
                    }
                  </div>
                }
              </section>
            }

            @if (selectedSlot() && selectedDoctor()) {
              <section class="patient-section">
                <h2>{{ specificDoctorMode() ? 'Appointment details' : '4. Appointment details' }}</h2>
                @if (loadingProfiles()) { <div class="loading"><mat-spinner diameter="24" /> Loading patient profiles…</div> }
                @if (!loadingProfiles() && profileError()) { <div class="error-banner">{{ profileError() }}</div> }
                @if (!loadingProfiles() && !profileError()) {
                  <p class="field-label">Who is this appointment for?</p>
                  <div class="who-toggle">
                    <button mat-stroked-button type="button" [class.active]="whoFor() === 'SELF'" (click)="chooseSelf()">Myself</button>
                    <button mat-stroked-button type="button" [class.active]="whoFor() === 'OTHER'" (click)="chooseOther()">Someone else</button>
                  </div>
                  @if (whoFor() === 'SELF') {
                    <div class="self-profile">
                      @if (auth.currentUser()?.profilePhotoUrl; as photoUrl) {
                        <img class="self-avatar" [src]="auth.profilePhotoSource(photoUrl)" alt="">
                      } @else { <mat-icon>account_circle</mat-icon> }
                      <div><strong>{{ selfProfile()?.fullName || auth.currentUser()?.name }}</strong><div>Your patient profile</div></div>
                    </div>
                  } @else {
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Saved family member</mat-label>
                      <mat-select [value]="selectedProfileId()" (selectionChange)="selectedProfileId.set($event.value)">
                        @for (p of familyProfiles(); track p.id) { <mat-option [value]="p.id">{{ p.fullName }} · {{ relationshipLabel(p.relationship) }}</mat-option> }
                      </mat-select>
                    </mat-form-field>
                    <button mat-button type="button" class="add-family" (click)="showFamilyForm.set(!showFamilyForm())">
                      <mat-icon>{{ showFamilyForm() ? 'close' : 'person_add' }}</mat-icon>{{ showFamilyForm() ? 'Cancel adding family member' : 'Add a family member' }}
                    </button>
                    @if (showFamilyForm()) {
                      <form [formGroup]="familyForm" class="family-form" (ngSubmit)="saveFamilyProfile()">
                        <mat-form-field appearance="outline" class="full-width"><mat-label>Full name</mat-label><input matInput formControlName="fullName" autocomplete="off"></mat-form-field>
                        <mat-form-field appearance="outline" class="full-width"><mat-label>Date of birth</mat-label><input matInput type="date" formControlName="dateOfBirth" [max]="todayKey"></mat-form-field>
                        <mat-form-field appearance="outline" class="full-width"><mat-label>Relationship</mat-label>
                          <mat-select formControlName="relationship">
                            <mat-option value="PARENT">Parent</mat-option><mat-option value="SPOUSE">Spouse</mat-option>
                            <mat-option value="CHILD">Child</mat-option><mat-option value="OTHER">Other</mat-option>
                          </mat-select>
                        </mat-form-field>
                        <button mat-stroked-button color="primary" type="submit" [disabled]="savingProfile()">Save family profile</button>
                      </form>
                    }
                    @if (familyProfiles().length === 0 && !showFamilyForm()) { <div class="muted">Add a family member profile to continue.</div> }
                  }
                  <mat-form-field appearance="outline" class="full-width reason-field"><mat-label>Reason for visit (optional)</mat-label>
                    <textarea matInput rows="2" maxlength="500" [formControl]="reasonControl"></textarea>
                  </mat-form-field>
                  @if (selectedPatientProfile()) {
                    <div class="summary"><mat-icon>event_available</mat-icon><div><strong>Selected appointment</strong>
                      <div>{{ selectedPatientProfile()!.fullName }} with {{ selectedDoctor()!.name }}</div>
                      <div>{{ formatDateKey(selectedSlot()!.date) }} · {{ formatTime(selectedSlot()!.time) }}</div>
                      <div class="amount-due">Total due: {{ selectedDoctor()!.consultationFee === null ? 'Fee not configured' : (selectedDoctor()!.consultationFee | currency:'INR':'symbol':'1.2-2') }}</div>
                    </div></div>
                  }
                  <p class="muted">Payment is pending when you book. No additional booking charges apply.</p>
                  <button mat-flat-button color="primary" type="button" (click)="submit()" [disabled]="submitting() || !selectedPatientProfile() || selectedDoctor()!.consultationFee === null">
                    @if (submitting()) { <mat-spinner diameter="20" /> } @else { Confirm booking }
                  </button>
                }
              </section>
            }
          </mat-card-content>
        </mat-card>
        <aside class="trust-card"><mat-icon>verified_user</mat-icon><h2>Your information stays with your account</h2><p>Only you can manage appointments booked under your account and patient profiles.</p><p>Appointment requests are sent to the selected doctor's office.</p></aside>
      </div>
    </div>
  `,
  styles: [`
    .booking-page{max-width:1150px}.booking-layout{display:grid;grid-template-columns:minmax(0,2fr) minmax(230px,1fr);gap:22px;align-items:start;margin-top:10px}
    .booking-card{overflow:hidden}.trust-card{padding:24px;background:#e7f5f3;border-radius:14px;color:#173b49}.trust-card mat-icon{color:#00897b}.trust-card h2{font-size:18px}
    h2{font-size:17px;margin:22px 0 12px;color:#123c4a}.full-width{width:100%}.loading{display:flex;align-items:center;gap:10px;padding:16px;color:var(--mc-muted)}
    .empty{padding:16px;background:#f2f7f7;border-radius:10px;color:var(--mc-muted);margin:12px 0}.doctors{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}
    .doctor-card mat-card-content{display:flex;flex-direction:column;gap:5px}.doctor-card button{margin-top:8px;align-self:start}.date-field{margin-top:8px}.fee-label,.amount-due{font-weight:600}
    ::ng-deep .available-date .mat-calendar-body-cell-content{background:#d9f3ee;border-color:#00897b;color:#00594f;font-weight:700}
    .time-slots{display:flex;flex-wrap:wrap;gap:9px}.time-chip{border:1px solid #b8c8ce;border-radius:9px;background:#fff;padding:10px 15px;color:#123c4a;cursor:pointer}
    .time-chip:hover,.time-chip.selected{background:#00897b;border-color:#00897b;color:#fff}.patient-section{border-top:1px solid #e1e9eb;margin-top:25px;padding-top:4px}
    .field-label{font-weight:600}.who-toggle{display:flex;gap:10px;margin-bottom:14px}.who-toggle .active{background:#e2f4f1;border-color:#00897b}
    .self-profile,.summary{display:flex;align-items:center;gap:12px;padding:14px;background:#f2f8f8;border-radius:10px;margin:12px 0}.self-profile mat-icon,.summary mat-icon{color:#00897b}.self-avatar{width:24px;height:24px;border-radius:50%;object-fit:cover}
    .add-family{margin:-8px 0 8px}.family-form{display:grid;grid-template-columns:1fr 1fr;gap:0 12px;padding:14px;background:#f7fafb;border-radius:10px;margin-bottom:12px}.family-form mat-form-field:last-of-type,.family-form button{grid-column:1/-1}
    .reason-field{margin-top:12px}.summary{background:#e6f5f2}.muted{font-size:14px;color:var(--mc-muted);margin:4px 0 10px}
    @media(max-width:800px){.booking-layout{grid-template-columns:1fr}.trust-card{order:-1}.family-form{grid-template-columns:1fr}}
  `]
})
export class BookAppointmentComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly doctorsApi = inject(DoctorService);
  private readonly appointmentsApi = inject(AppointmentService);
  private readonly specializationsApi = inject(SpecializationService);
  private readonly profilesApi = inject(PatientProfileService);
  private readonly snackBar = inject(MatSnackBar);
  readonly auth = inject(AuthService);

  readonly specializations = signal<Specialization[]>([]);
  readonly selectedSpecializationId = signal<number | null>(null);
  readonly doctors = signal<Doctor[]>([]);
  readonly selectedDoctor = signal<Doctor | null>(null);
  readonly availableSlots = signal<AvailableSlot[]>([]);
  readonly selectedSlot = signal<AvailableSlot | null>(null);
  readonly selectedDate = signal<Date | null>(null);
  readonly selectedSpecialization = signal<Specialization | null>(null);
  readonly specificDoctorMode = signal(false);
  readonly loadingSpecializations = signal(false);
  readonly loadingDoctors = signal(false);
  readonly loadingSlots = signal(false);
  readonly slotsLoaded = signal(false);
  readonly availabilityError = signal(false);
  readonly submitting = signal(false);
  readonly loadingProfiles = signal(false);
  readonly savingProfile = signal(false);
  readonly profileError = signal<string | null>(null);
  readonly showFamilyForm = signal(false);
  readonly whoFor = signal<'SELF' | 'OTHER'>('SELF');
  readonly profiles = signal<PatientProfile[]>([]);
  readonly selectedProfileId = signal<number | null>(null);
  readonly error = signal<string | null>(null);
  readonly doctorEmptyMessage = signal('No doctors found for this specialty.');
  readonly slotEmptyMessage = signal('No appointments are available in the next 90 days. Choose another doctor or check again later.');
  readonly dateControl = this.fb.control<Date | null>(null);
  readonly reasonControl = this.fb.nonNullable.control('', Validators.maxLength(500));
  readonly familyForm = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(120)]],
    dateOfBirth: ['', Validators.required],
    relationship: ['' as PatientRelationship | '', Validators.required]
  });
  readonly minDate = this.dateAtMidnight(new Date());
  readonly maxDate = this.dateAtMidnight(new Date(Date.now() + 89 * 86400000));
  readonly todayKey = this.toDateKey(this.minDate);
  readonly dateFilter = (date: Date | null): boolean => !!date && this.availableDateKeys().has(this.toDateKey(date));
  readonly dateClass = (date: Date): MatCalendarCellCssClasses =>
    this.availableDateKeys().has(this.toDateKey(date)) ? 'available-date' : '';

  ngOnInit(): void {
    this.loadProfiles();
    const doctorId = Number(this.route.snapshot.paramMap.get('doctorId'));
    if (doctorId > 0) {
      this.specificDoctorMode.set(true);
      this.loadingSlots.set(true);
      this.doctorsApi.getById(doctorId).subscribe({
        next: doctor => { this.selectedDoctor.set(doctor); this.loadSlots(doctor); },
        error: err => { this.error.set(extractErrorMessage(err)); this.loadingSlots.set(false); }
      });
      return;
    }
    this.loadingSpecializations.set(true);
    this.specializationsApi.getAll().subscribe({
      next: list => {
        this.specializations.set(list); this.loadingSpecializations.set(false);
        const requested = Number(this.route.snapshot.queryParamMap.get('specializationId'));
        if (requested && list.some(s => s.id === requested)) this.specializationChanged(requested);
      },
      error: err => { this.error.set(extractErrorMessage(err)); this.loadingSpecializations.set(false); }
    });
  }

  specializationChanged(id: number): void {
    this.selectedSpecializationId.set(id);
    this.selectedSpecialization.set(this.specializations().find(s => s.id === id) ?? null);
    this.selectedDoctor.set(null); this.doctors.set([]); this.resetSlots(); this.error.set(null);
    this.loadingDoctors.set(true);
    this.doctorsApi.getBySpecialization(id).subscribe({
      next: rows => {
        this.doctors.set(rows);
        this.doctorEmptyMessage.set('No doctors are listed for this specialty.');
        this.loadingDoctors.set(false);
      },
      error: err => { this.error.set(extractErrorMessage(err)); this.loadingDoctors.set(false); }
    });
  }

  chooseDoctor(doctor: Doctor): void { this.selectedDoctor.set(doctor); this.resetSlots(); this.loadSlots(doctor); }

  loadSlots(doctor: Doctor, clearError = true): void {
    this.loadingSlots.set(true); this.slotsLoaded.set(false); this.availabilityError.set(false);
    if (clearError) this.error.set(null);
    this.appointmentsApi.searchAvailability(doctor.id, this.todayKey, this.toDateKey(this.maxDate)).subscribe({
      next: result => {
        this.availableSlots.set(result.slots); this.slotsLoaded.set(true); this.loadingSlots.set(false);
        const messages:Record<string,string>={NO_SCHEDULE:`${doctor.name} has no weekly schedule configured. An administrator can configure it from Manage Doctors → Configure schedule.`,NO_WORKING_DAYS:'The doctor has no scheduled working days in this date range.',APPROVED_LEAVE:'The doctor is on approved leave for all scheduled dates in this range.',FULLY_BOOKED:'All scheduled times in this date range are already booked.',DOCTOR_UNAVAILABLE:'This doctor is not currently accepting appointments.',AVAILABLE:''};
        this.slotEmptyMessage.set(messages[result.reason] ?? 'No appointment times are available in this date range.');
      },
      error: err => { this.error.set(extractErrorMessage(err)); this.availabilityError.set(true); this.loadingSlots.set(false); this.slotsLoaded.set(false); }
    });
  }

  selectDate(date: Date | null): void {
    this.selectedDate.set(date ? this.dateAtMidnight(date) : null);
    const key = date ? this.toDateKey(date) : '';
    this.selectedSlot.set(null);
    if (key && !this.availableDateKeys().has(key)) this.selectedDate.set(null);
  }

  dateSlots(): AvailableSlot[] {
    const date = this.selectedDate();
    return date ? this.availableSlots().filter(slot => slot.date === this.toDateKey(date)) : [];
  }

  private availableDateKeys(): Set<string> { return new Set(this.availableSlots().map(slot => slot.date)); }
  private resetSlots(): void {
    this.availableSlots.set([]); this.selectedSlot.set(null); this.selectedDate.set(null);
    this.dateControl.setValue(null); this.slotsLoaded.set(false); this.availabilityError.set(false);
  }

  loadProfiles(): void {
    this.loadingProfiles.set(true); this.profileError.set(null);
    this.profilesApi.getMine().subscribe({
      next: profiles => {
        this.profiles.set(profiles); this.selectedProfileId.set(profiles.find(p => p.self)?.id ?? null);
        this.loadingProfiles.set(false);
      },
      error: err => { this.profileError.set(extractErrorMessage(err)); this.loadingProfiles.set(false); }
    });
  }

  selfProfile(): PatientProfile | undefined { return this.profiles().find(p => p.self); }
  familyProfiles(): PatientProfile[] { return this.profiles().filter(p => !p.self); }
  selectedPatientProfile(): PatientProfile | undefined {
    if (this.whoFor() === 'SELF') return this.selfProfile();
    return this.profiles().find(p => p.id === this.selectedProfileId() && !p.self);
  }
  chooseSelf(): void { this.whoFor.set('SELF'); this.selectedProfileId.set(this.selfProfile()?.id ?? null); }
  chooseOther(): void { this.whoFor.set('OTHER'); this.selectedProfileId.set(this.familyProfiles()[0]?.id ?? null); }

  saveFamilyProfile(): void {
    if (this.familyForm.invalid) { this.familyForm.markAllAsTouched(); return; }
    const raw = this.familyForm.getRawValue();
    if (!raw.relationship || raw.relationship === 'SELF') return;
    this.savingProfile.set(true); this.profileError.set(null);
    this.profilesApi.addBeneficiary({ fullName: raw.fullName.trim(), dateOfBirth: raw.dateOfBirth, relationship: raw.relationship }).subscribe({
      next: profile => {
        this.profiles.update(list => [...list, profile]); this.selectedProfileId.set(profile.id);
        this.whoFor.set('OTHER'); this.showFamilyForm.set(false); this.familyForm.reset(); this.savingProfile.set(false);
      },
      error: err => { this.profileError.set(extractErrorMessage(err)); this.savingProfile.set(false); }
    });
  }

  submit(): void {
    const doctor = this.selectedDoctor(); const slot = this.selectedSlot(); const profile = this.selectedPatientProfile();
    if (!doctor || !slot || !profile) return;
    this.submitting.set(true); this.error.set(null);
    const appointmentDate = `${slot.date}T${slot.time.substring(0, 8)}`;
    const reason = this.reasonControl.value.trim();
    this.appointmentsApi.book({ doctorId: doctor.id, patientProfileId: profile.id, specializationId: doctor.specializationId,
      appointmentDate, ...(reason ? { reason } : {}) }).subscribe({
      next: () => { this.snackBar.open('Appointment booked successfully', 'OK', { duration: 3000 }); this.router.navigate(['/my-appointments']); },
      error: err => {
        const message = extractErrorMessage(err);
        const lowered = message.toLowerCase();
        this.error.set(err?.status === 429 ? 'Please wait before submitting another appointment request.'
          : err?.status === 409 && lowered.includes('slot') ? 'This appointment slot is no longer available. Please choose another time.'
          : message);
        this.submitting.set(false); this.loadSlots(doctor, false);
      }
    });
  }

  relationshipLabel(value: PatientRelationship): string { return value.charAt(0) + value.slice(1).toLowerCase(); }
  formatDateKey(date: string): string { return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }); }
  dateKey(date: Date): string { return this.toDateKey(date); }
  private toDateKey(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
  private dateAtMidnight(date: Date): Date { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
  formatTime(value: string): string { const [h, m] = value.split(':'); const hour = Number(h); return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`; }
}
