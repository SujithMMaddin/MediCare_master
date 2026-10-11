import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PatientProfile, PatientProfileRequest } from '../models/patient-profile.model';

@Injectable({ providedIn: 'root' })
export class PatientProfileService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/patient-profiles`;

  getMine(): Observable<PatientProfile[]> { return this.http.get<PatientProfile[]>(this.url); }
  addBeneficiary(request: PatientProfileRequest): Observable<PatientProfile> {
    return this.http.post<PatientProfile>(this.url, request);
  }
}
