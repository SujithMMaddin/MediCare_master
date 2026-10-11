import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Doctor, DoctorRequest } from '../models/doctor.model';
import { HttpParams } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class DoctorService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/doctors`;

  getAll(includeInactive = false): Observable<Doctor[]> {
    return this.http.get<Doctor[]>(this.baseUrl, {
      params: includeInactive ? new HttpParams().set('includeInactive', true) : undefined
    });
  }

  getBySpecialization(specializationId: number): Observable<Doctor[]> {
    return this.http.get<Doctor[]>(this.baseUrl, {
      params: new HttpParams().set('specializationId', specializationId)
    });
  }

  getById(id: number): Observable<Doctor> {
    return this.http.get<Doctor>(`${this.baseUrl}/${id}`);
  }
  getAvailability(id:number):Observable<AvailabilityRow[]>{return this.http.get<AvailabilityRow[]>(`${this.baseUrl}/${id}/availability`)}
  addAvailability(id:number,row:Omit<AvailabilityRow,'id'|'doctorId'>):Observable<AvailabilityRow>{return this.http.post<AvailabilityRow>(`${this.baseUrl}/${id}/availability`,row)}
  deleteAvailability(id:number,scheduleId:number):Observable<void>{return this.http.delete<void>(`${this.baseUrl}/${id}/availability/${scheduleId}`)}

  create(request: DoctorRequest): Observable<Doctor> {
    return this.http.post<Doctor>(this.baseUrl, request);
  }

  update(id: number, request: DoctorRequest): Observable<Doctor> {
    return this.http.put<Doctor>(`${this.baseUrl}/${id}`, request);
  }

  updateFee(id: number, consultationFee: number): Observable<Doctor> {
    return this.http.put<Doctor>(`${this.baseUrl}/${id}/fee`, { consultationFee });
  }

  useSpecializationFee(id: number): Observable<Doctor> {
    return this.http.delete<Doctor>(`${this.baseUrl}/${id}/fee`);
  }

  updateStatus(id: number, active: boolean): Observable<Doctor> {
    return this.http.put<Doctor>(`${this.baseUrl}/${id}/status`, { active });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
export interface AvailabilityRow { id:number; doctorId:number; dayOfWeek:string; startTime:string; endTime:string; slotDurationMinutes:number; }
