import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Doctor } from '../../core/models/doctor.model';
import { Specialization } from '../../core/models/specialization.model';
import { DoctorService } from '../../core/services/doctor.service';
import { SpecializationService } from '../../core/services/specialization.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-home', standalone: true, imports: [RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-copy"><span class="eyebrow"><mat-icon>health_and_safety</mat-icon> CARE THAT FITS YOUR LIFE</span>
          <h1>Healthcare appointments, made <em>simpler.</em></h1>
          <p>Find a doctor, explore specialties, and choose an appointment time that works for you.</p>
          <div class="hero-actions"><a mat-flat-button class="cta" routerLink="/doctors"><mat-icon>search</mat-icon> Find a doctor</a>
            <a mat-stroked-button class="secondary" routerLink="/specializations">Explore specialties</a></div>
          <div class="hero-note"><mat-icon>lock</mat-icon><span>Private patient accounts · Clear appointment details · Easy scheduling</span></div>
        </div>
        <div class="hero-art" aria-hidden="true"><div class="art-circle"><mat-icon>medical_services</mat-icon></div><div class="art-card"><mat-icon>event_available</mat-icon><span>Appointments on your schedule</span></div><div class="art-plus">+</div></div>
      </div>
    </section>
    <main class="home-content">
      <section class="quick-links" aria-label="Explore MediCare"><a routerLink="/doctors"><mat-icon>stethoscope</mat-icon><span>Browse doctors</span><mat-icon class="arrow">arrow_forward</mat-icon></a>
        <a routerLink="/specializations"><mat-icon>category</mat-icon><span>Explore specialties</span><mat-icon class="arrow">arrow_forward</mat-icon></a>
        <a routerLink="/register"><mat-icon>person_add</mat-icon><span>Create an account</span><mat-icon class="arrow">arrow_forward</mat-icon></a></section>
      <section class="section" id="specialties"><div class="section-heading"><div><span class="eyebrow">EXPLORE CARE</span><h2>Browse by specialty</h2><p>Start with the kind of care you are looking for.</p></div><a mat-button routerLink="/specializations">View all <mat-icon>arrow_forward</mat-icon></a></div>
        @if (loadingSpecialties()) { <div class="loading"><mat-spinner diameter="28" /></div> }
        @else { <div class="specialty-grid">@for (specialty of specialties().slice(0, 6); track specialty.id) {
          <a class="specialty" [routerLink]="auth.isPatient() ? ['/book'] : ['/specializations']" [queryParams]="auth.isPatient() ? {specializationId: specialty.id} : null"><span class="icon"><mat-icon>{{ specialtyIcon(specialty.name) }}</mat-icon></span><strong>{{ specialty.name }}</strong><span>{{ auth.isPatient() ? 'Find a doctor' : 'Explore specialty' }} <mat-icon>arrow_forward</mat-icon></span></a>
        }</div> }
      </section>
      <section class="section doctors-section"><div class="section-heading"><div><span class="eyebrow">MEET OUR CLINICIANS</span><h2>Featured doctors</h2><p>Browse the doctors currently listed with MediCare.</p></div><a mat-button routerLink="/doctors">All doctors <mat-icon>arrow_forward</mat-icon></a></div>
        @if (loadingDoctors()) { <div class="loading"><mat-spinner diameter="28" /></div> }
        @else if (doctors().length) { <div class="doctor-grid">@for (doctor of doctors().slice(0, 3); track doctor.id) {
          <mat-card class="doctor-card"><mat-card-content><div class="doctor-avatar"><mat-icon>person</mat-icon></div><div class="doctor-info"><h3>{{ doctor.name }}</h3><p>{{ doctor.specialization }}</p><a mat-button [routerLink]="['/doctors', doctor.id]">View profile <mat-icon>arrow_forward</mat-icon></a></div></mat-card-content></mat-card>
        }</div> }
        @else { <p class="muted">Doctor information is temporarily unavailable.</p> }
      </section>
      <section class="how" id="about"><div class="how-copy"><span class="eyebrow">HOW IT WORKS</span><h2>A clear path to your appointment</h2><p>Browse at your pace. You can review available doctors and appointment times before creating an account or signing in to book.</p><a mat-flat-button class="cta" routerLink="/doctors">Start browsing <mat-icon>arrow_forward</mat-icon></a></div>
        <div class="steps"><article><span>01</span><div><h3>Choose a doctor</h3><p>Browse profiles and specialties available in MediCare.</p></div></article><article><span>02</span><div><h3>Pick a time</h3><p>See the selected doctor's open appointment times.</p></div></article><article><span>03</span><div><h3>Confirm who is coming</h3><p>Book for yourself or a family member on your account.</p></div></article></div>
      </section>
      <section class="closing"><div><span class="eyebrow">YOUR NEXT STEP</span><h2>Ready to find the right appointment?</h2></div><a mat-flat-button class="cta" routerLink="/doctors">Find a doctor <mat-icon>arrow_forward</mat-icon></a></section>
    </main>
    <footer class="footer"><div class="footer-brand"><strong><mat-icon>local_hospital</mat-icon> MediCare</strong><p>Appointment information and scheduling in one place.</p></div><div><strong>Explore</strong><a routerLink="/doctors">Doctors</a><a routerLink="/specializations">Specialties</a></div><div><strong>Help &amp; contact</strong><a routerLink="/doctors">Find your clinic</a><a routerLink="/" fragment="about">How booking works</a><a routerLink="/login">Sign in for account help</a></div><small>© {{ year }} MediCare. For appointment changes, contact the clinic you booked with.</small></footer>
  `,
  styles: [`
    :host{display:block;background:#fff}.hero{background:linear-gradient(115deg,#eef8f6 0%,#f5faf9 57%,#e3f2f0 100%);overflow:hidden}.hero-inner{max-width:1180px;margin:auto;min-height:470px;padding:65px 24px;display:grid;grid-template-columns:1.15fr .85fr;align-items:center;gap:30px}.hero-copy{max-width:650px}.eyebrow{color:#00796b;font-weight:700;letter-spacing:1.35px;font-size:11px;display:flex;align-items:center;gap:6px}.eyebrow mat-icon{font-size:17px;width:17px;height:17px}.hero h1{font-size:clamp(40px,5.2vw,64px);line-height:1.06;letter-spacing:-2px;color:#133c4b;margin:22px 0 18px}.hero h1 em{font-style:normal;color:#00897b}.hero-copy>p{font-size:18px;line-height:1.6;color:#49646e;max-width:520px}.hero-actions{display:flex;gap:12px;margin:28px 0}.cta{background:#00796b;color:#fff!important;border-radius:9px;min-height:46px;padding:0 18px}.secondary{border-color:#78aaa4;color:#005f55;border-radius:9px;min-height:46px}.hero-note{display:flex;align-items:center;gap:8px;color:#5f767e;font-size:12px}.hero-note mat-icon{font-size:17px}.hero-art{height:340px;position:relative;display:flex;align-items:center;justify-content:center}.art-circle{width:260px;height:260px;border-radius:50%;background:#d1eae5;display:grid;place-items:center}.art-circle mat-icon{font-size:116px;width:116px;height:116px;color:#00897b}.art-card{position:absolute;left:4%;bottom:28px;background:#fff;border-radius:12px;box-shadow:0 12px 35px #153b4b22;padding:17px;display:flex;align-items:center;gap:12px;color:#244b57;font-weight:600}.art-card mat-icon{color:#00897b}.art-plus{position:absolute;right:12%;top:30px;font-size:64px;color:#55aaa0;font-weight:200}.home-content{max-width:1180px;margin:auto;padding:0 24px}.quick-links{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid #e4ecec;border-radius:13px;background:#fff;margin-top:-26px;position:relative;box-shadow:0 8px 28px #123c4b0d}.quick-links a{padding:22px;display:flex;align-items:center;gap:12px;text-decoration:none;color:#234753;font-weight:600}.quick-links a+ a{border-left:1px solid #e4ecec}.quick-links a>mat-icon:first-child{color:#00897b}.quick-links .arrow{margin-left:auto;font-size:18px;color:#789096}.section{padding:68px 0 20px}.section-heading{display:flex;justify-content:space-between;align-items:end;gap:20px;margin-bottom:22px}.section-heading h2,.how h2,.closing h2{font-size:32px;letter-spacing:-.6px;color:#153e4d;margin:9px 0}.section-heading p,.how-copy p{color:#637981;margin:0}.specialty-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.specialty{border:1px solid #e4ecec;border-radius:12px;padding:19px;display:grid;grid-template-columns:48px 1fr;align-items:center;gap:4px 12px;text-decoration:none;color:#193f4c;transition:transform .15s,border-color .15s}.specialty:hover{transform:translateY(-2px);border-color:#79bcb4}.specialty .icon{grid-row:span 2;width:46px;height:46px;border-radius:12px;background:#e5f4f1;display:grid;place-items:center;color:#00897b}.specialty>span:last-child{font-size:13px;color:#668087;display:flex;align-items:center;gap:6px}.specialty>span:last-child mat-icon{font-size:16px;width:16px;height:16px}.doctors-section{padding-top:60px}.doctor-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.doctor-card{border:1px solid #e5eded;box-shadow:none!important}.doctor-card mat-card-content{display:flex;align-items:center;gap:17px;padding:20px}.doctor-avatar{width:64px;height:64px;border-radius:50%;background:#e3f2f0;display:grid;place-items:center;color:#00897b}.doctor-avatar mat-icon{font-size:34px;width:34px;height:34px}.doctor-info h3{margin:0;color:#193f4c}.doctor-info p{margin:5px 0;color:#668087}.doctor-info a{padding:0;margin-left:-8px}.doctor-info a mat-icon{font-size:17px}.how{margin:70px 0;padding:45px;background:#f1f8f7;border-radius:18px;display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center}.how-copy h2{max-width:440px}.how-copy p{line-height:1.6;margin-bottom:20px}.steps{display:grid;gap:19px}.steps article{display:flex;gap:16px}.steps article>span{color:#00897b;font-weight:700;font-size:14px;padding-top:3px}.steps h3{margin:0 0 4px;font-size:16px;color:#183e4b}.steps p{margin:0;color:#637981;font-size:14px}.closing{background:#123e4c;border-radius:16px;padding:30px 36px;display:flex;align-items:center;justify-content:space-between;gap:20px;margin:55px 0}.closing h2{color:#fff;margin-bottom:0}.closing .eyebrow{color:#8dd3c9}.footer{background:#f3f8f7;padding:40px max(24px,calc((100% - 1132px)/2));display:grid;grid-template-columns:2fr 1fr 1fr;gap:25px;color:#31535d}.footer-brand strong{display:flex;align-items:center;gap:7px;font-size:19px;color:#00796b}.footer-brand p{color:#687f86;font-size:13px;max-width:280px}.footer>div:not(:first-child){display:flex;flex-direction:column;gap:9px;font-size:14px}.footer a{color:#496a73;text-decoration:none}.footer a:hover{text-decoration:underline}.footer small{grid-column:1/-1;color:#71868c;border-top:1px solid #dce8e6;padding-top:18px}.loading{display:flex;justify-content:center;padding:30px}.muted{color:#71868c}@media(max-width:760px){.hero-inner{grid-template-columns:1fr;padding-top:44px}.hero-art{height:250px}.art-circle{width:190px;height:190px}.art-circle mat-icon{font-size:86px}.hero-note{align-items:flex-start}.quick-links{grid-template-columns:1fr;margin-top:-15px}.quick-links a{padding:15px}.quick-links a+a{border-left:0;border-top:1px solid #e4ecec}.specialty-grid,.doctor-grid{grid-template-columns:1fr 1fr}.how{grid-template-columns:1fr;gap:30px;padding:28px}.closing{align-items:flex-start;flex-direction:column}.footer{grid-template-columns:1fr 1fr}.footer-brand{grid-column:1/-1}}@media(max-width:480px){.hero h1{font-size:42px}.hero-actions{flex-direction:column;align-items:stretch}.specialty-grid,.doctor-grid{grid-template-columns:1fr}.section-heading{align-items:flex-start;flex-direction:column}.home-content{padding:0 16px}}
  `]
})
export class HomeComponent implements OnInit {
  private readonly doctorApi = inject(DoctorService);
  private readonly specialtyApi = inject(SpecializationService);
  readonly auth = inject(AuthService);
  readonly doctors = signal<Doctor[]>([]);
  readonly specialties = signal<Specialization[]>([]);
  readonly loadingDoctors = signal(true);
  readonly loadingSpecialties = signal(true);
  readonly year = new Date().getFullYear();
  ngOnInit(): void {
    this.doctorApi.getAll().subscribe({next: rows => {this.doctors.set(rows);this.loadingDoctors.set(false);},error:()=>this.loadingDoctors.set(false)});
    this.specialtyApi.getAll().subscribe({next: rows => {this.specialties.set(rows);this.loadingSpecialties.set(false);},error:()=>this.loadingSpecialties.set(false)});
  }
  specialtyIcon(name: string): string {
    const value = name.toLowerCase();
    if (value.includes('heart') || value.includes('cardio')) return 'favorite';
    if (value.includes('neuro')) return 'psychology';
    if (value.includes('child') || value.includes('pedia')) return 'child_care';
    if (value.includes('skin') || value.includes('derma')) return 'face';
    if (value.includes('ortho')) return 'accessibility_new';
    return 'medical_services';
  }
}
