import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Specialization } from '../models/specialization.model';

@Injectable({ providedIn: 'root' })
export class SpecializationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/specializations`;

  getAll(): Observable<Specialization[]> {
    return this.http.get<Specialization[]>(this.baseUrl);
  }

  updateFee(id: number, consultationFee: number): Observable<Specialization> {
    return this.http.put<Specialization>(`${this.baseUrl}/${id}/fee`, { consultationFee });
  }
}