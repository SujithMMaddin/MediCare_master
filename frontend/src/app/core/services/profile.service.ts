import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Profile, ProfileUpdateResult } from '../models/profile.model';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/profile`;

  photoBaseUrl(): string {
    return environment.apiUrl;
  }

  getMine(): Observable<Profile> {
    return this.http.get<Profile>(this.baseUrl);
  }

  updateMine(request: { name: string; email: string; profilePhotoUrl: string | null }): Observable<ProfileUpdateResult> {
    return this.http.put<ProfileUpdateResult>(this.baseUrl, request);
  }

  uploadPhoto(file: File): Observable<Profile> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<Profile>(`${this.baseUrl}/photo`, form);
  }

  changePassword(request: { currentPassword: string; newPassword: string }): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/password`, request);
  }

  updateDoctorDetails(request: { bio: string; qualifications: string; experienceYears: number | null; phone: string }): Observable<Profile> {
    return this.http.put<Profile>(`${this.baseUrl}/doctor-details`, request);
  }
}
