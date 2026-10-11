import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, RegisterRequest, Role } from '../models/auth.model';

const STORAGE_KEY = 'medicare_auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  private readonly session = signal<LoginResponse | null>(this.readSession());

  readonly currentUser = this.session.asReadonly();
  readonly isLoggedIn = computed(() => this.session() !== null);
  readonly isAdmin = computed(() => this.hasRole('ADMIN'));
  readonly isDoctor = computed(() => this.hasRole('DOCTOR'));
  readonly isPatient = computed(() => this.hasRole('PATIENT'));

  hasRole(role: Role): boolean {
    const currentRole = String(this.session()?.role ?? '').toUpperCase();
    return currentRole === role || currentRole === `ROLE_${role}`;
  }

  register(request: RegisterRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/register`, request)
      .pipe(tap((res) => this.saveSession(res)));
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/login`, request)
      .pipe(tap((res) => this.saveSession(res)));
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.session.set(null);
    this.router.navigate(['/login']);
  }

  updateSession(session: LoginResponse): void {
    this.saveSession(session);
  }

  updateProfilePhoto(profilePhotoUrl: string | null): void {
    const current = this.session();
    if (current) this.saveSession({ ...current, profilePhotoUrl });
  }

  getToken(): string | null {
    return this.session()?.token ?? null;
  }

  profilePhotoSource(value: string): string {
    return /^https?:\/\//i.test(value) ? value : new URL(value, environment.apiUrl).toString();
  }

  /** Where a user should land after login, based on role. */
  homeRoute(): string {
    if (this.isAdmin()) return '/admin';
    if (this.isDoctor()) return '/doctor/appointments';
    return '/dashboard';
  }

  private saveSession(res: LoginResponse): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(res));
    this.session.set(res);
  }

  private readSession(): LoginResponse | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as LoginResponse) : null;
    } catch {
      return null;
    }
  }
}
