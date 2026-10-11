import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  AppointmentRequest,
  AppointmentResponse,
  PaymentStatus
} from '../models/appointment.model';
import { BillingResponse } from '../models/billing.model';
import { DoctorReview } from '../models/workflow.model';


export interface AvailableSlot {
  date: string;
  time: string;
}
export interface AvailabilitySearch { slots:AvailableSlot[]; reason:'AVAILABLE'|'NO_SCHEDULE'|'NO_WORKING_DAYS'|'APPROVED_LEAVE'|'FULLY_BOOKED'|'DOCTOR_UNAVAILABLE'; }
export interface PatientHistoryRow { patientProfileId:number; patientName:string; dateOfBirth:string|null; relationship:string; appointmentDate:string|null; appointmentStatus:string|null; doctorName:string|null; specialization:string|null; clinicalInformation:string|null; }
export interface PatientHistoryPage { content:PatientHistoryRow[]; totalElements:number; totalPages:number; number:number; size:number; }

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/appointments`;

  book(request: AppointmentRequest): Observable<AppointmentResponse> {
    return this.http.post<AppointmentResponse>(this.baseUrl, request);
  }

  getAvailableSlots(doctorId: number, from: string, to: string): Observable<AvailableSlot[]> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<AvailableSlot[]>(`${environment.apiUrl}/doctors/${doctorId}/available-slots`, { params });
  }
  searchAvailability(doctorId:number,from:string,to:string):Observable<AvailabilitySearch>{const params=new HttpParams().set('from',from).set('to',to);return this.http.get<AvailabilitySearch>(`${environment.apiUrl}/doctors/${doctorId}/availability-search`,{params})}

  getMine(): Observable<AppointmentResponse[]> {
    return this.http.get<AppointmentResponse[]>(`${this.baseUrl}/my`);
  }

  getDoctorAppointments(): Observable<AppointmentResponse[]> {
    return this.http.get<AppointmentResponse[]>(`${this.baseUrl}/doctor/my`);
  }

  patientHistory(params: Record<string, string | number>): Observable<PatientHistoryPage> {
    let query = new HttpParams();
    for (const [key, value] of Object.entries(params)) query = query.set(key, value);
    return this.http.get<PatientHistoryPage>(`${environment.apiUrl}/patient-history`, { params: query });
  }

  getAll(): Observable<AppointmentResponse[]> {
    return this.http.get<AppointmentResponse[]>(`${this.baseUrl}/all`);
  }

  cancel(id: number): Observable<AppointmentResponse> {
    return this.http.put<AppointmentResponse>(
      `${this.baseUrl}/${id}/cancel`,
      {}
    );
  }

  reschedule(id: number, appointmentDate: string): Observable<AppointmentResponse> {
    return this.http.put<AppointmentResponse>(`${this.baseUrl}/${id}/reschedule`, { appointmentDate });
  }

  review(id: number, rating: number, comment: string): Observable<DoctorReview> {
    return this.http.post<DoctorReview>(`${this.baseUrl}/${id}/reviews`, { rating, comment });
  }

  confirm(id: number): Observable<AppointmentResponse> {
    return this.http.put<AppointmentResponse>(
      `${this.baseUrl}/${id}/confirm`,
      {}
    );
  }

  reject(id: number): Observable<AppointmentResponse> {
    return this.http.put<AppointmentResponse>(
      `${this.baseUrl}/${id}/reject`,
      {}
    );
  }

  complete(id: number): Observable<AppointmentResponse> {
    return this.http.put<AppointmentResponse>(
      `${this.baseUrl}/${id}/complete`,
      {}
    );
  }

  markNoShow(id: number): Observable<AppointmentResponse> {
    return this.http.put<AppointmentResponse>(
      `${this.baseUrl}/${id}/no-show`,
      {}
    );
  }

  downloadReceipt(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/receipt`, { responseType: 'blob' });
  }

  updatePaymentStatus(id: number, status: PaymentStatus): Observable<BillingResponse> {
    return this.http.put<BillingResponse>(
      `${environment.apiUrl}/billing/appointments/${id}/status`,
      { status }
    );
  }
}
