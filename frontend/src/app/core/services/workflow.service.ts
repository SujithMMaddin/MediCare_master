import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminReport, DoctorLeave, DoctorReview, FeeChangeRequest, Notification } from '../models/workflow.model';
import { ProfileScheduleEntry } from '../models/profile.model';

@Injectable({ providedIn: 'root' })
export class WorkflowService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;
  readonly unreadTotal = signal(0);
  readonly notificationError = signal<string | null>(null);
  readonly doctorLeaves = signal<DoctorLeave[]>([]);
  readonly pendingLeaveCount = signal(0);

  notifications(): Observable<Notification[]> { return this.http.get<Notification[]>(`${this.api}/notifications`); }
  unreadCount(): Observable<number> { return this.http.get<number>(`${this.api}/notifications/unread-count`); }
  refreshUnread(): void {
    this.unreadCount().subscribe({
      next: count => { this.unreadTotal.set(count); this.notificationError.set(null); },
      error: err => this.notificationError.set(err?.message ?? 'Unable to load notification count')
    });
  }
  markRead(id: number): Observable<Notification> {
    return this.http.put<Notification>(`${this.api}/notifications/${id}/read`, {}).pipe(
      tap(() => this.unreadTotal.update(count => Math.max(0, count - 1)))
    );
  }
  report(): Observable<AdminReport> { return this.http.get<AdminReport>(`${this.api}/admin/reports`); }

  myLeaves(): Observable<DoctorLeave[]> { return this.http.get<DoctorLeave[]>(`${this.api}/doctor/leaves`); }
  addLeave(request: { startDate: string; endDate: string; reason: string }): Observable<DoctorLeave> {
    return this.http.post<DoctorLeave>(`${this.api}/doctor/leaves`, request);
  }
  deleteLeave(id: number): Observable<void> { return this.http.delete<void>(`${this.api}/doctor/leaves/${id}`); }
  allLeaves(): Observable<DoctorLeave[]> {
    return this.http.get<DoctorLeave[]>(`${this.api}/doctor/leaves/admin`).pipe(
      tap(leaves => this.updateDoctorLeaves(leaves))
    );
  }
  removeLeaveAsAdmin(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/doctor/leaves/admin/${id}`).pipe(
      tap(() => this.updateDoctorLeaves(this.doctorLeaves().filter(leave => leave.id !== id)))
    );
  }
  decideLeave(id: number, status: 'APPROVED' | 'REJECTED', comment: string | null = null): Observable<DoctorLeave> {
    return this.http.put<DoctorLeave>(`${this.api}/doctor/leaves/${id}/decision`, { status, comment }).pipe(
      tap(updated => {
        const current = this.doctorLeaves();
        if (current.some(leave => leave.id === updated.id)) {
          this.updateDoctorLeaves(current.map(leave => leave.id === updated.id ? updated : leave));
        } else if (status === 'APPROVED' || status === 'REJECTED') {
          this.pendingLeaveCount.update(count => Math.max(0, count - 1));
        }
      })
    );
  }

  myFeeRequests(): Observable<FeeChangeRequest[]> { return this.http.get<FeeChangeRequest[]>(`${this.api}/fee-change-requests/my`); }
  feeRequests(): Observable<FeeChangeRequest[]> { return this.http.get<FeeChangeRequest[]>(`${this.api}/fee-change-requests`); }
  requestFee(proposedFee: number, reason: string): Observable<FeeChangeRequest> {
    return this.http.post<FeeChangeRequest>(`${this.api}/fee-change-requests`, { proposedFee, reason });
  }
  decideFee(id: number, status: 'APPROVED' | 'REJECTED', comment: string): Observable<FeeChangeRequest> {
    return this.http.put<FeeChangeRequest>(`${this.api}/fee-change-requests/${id}`, { status, comment });
  }

  reviews(): Observable<DoctorReview[]> { return this.http.get<DoctorReview[]>(`${this.api}/reviews/admin`); }
  myReviews(): Observable<DoctorReview[]> { return this.http.get<DoctorReview[]>(`${this.api}/reviews/my`); }
  reviewsForDoctor(id: number): Observable<DoctorReview[]> { return this.http.get<DoctorReview[]>(`${this.api}/doctors/${id}/reviews`); }
  moderateReview(id: number, approved: boolean): Observable<DoctorReview> {
    return this.http.put<DoctorReview>(`${this.api}/reviews/admin/${id}`, { approved });
  }
  deleteReview(id: number): Observable<void> { return this.http.delete<void>(`${this.api}/reviews/admin/${id}`); }
  createReview(appointmentId: number, rating: number, comment: string): Observable<DoctorReview> {
    return this.http.post<DoctorReview>(`${this.api}/appointments/${appointmentId}/reviews`, { rating, comment });
  }

  addSchedule(doctorId: number, request: { dayOfWeek: string; startTime: string; endTime: string; slotDurationMinutes: number }): Observable<ProfileScheduleEntry> {
    return this.http.post<ProfileScheduleEntry>(`${this.api}/doctors/${doctorId}/availability`, request);
  }
  updateSchedule(doctorId: number, id: number, request: { dayOfWeek: string; startTime: string; endTime: string; slotDurationMinutes: number }): Observable<ProfileScheduleEntry> {
    return this.http.put<ProfileScheduleEntry>(`${this.api}/doctors/${doctorId}/availability/${id}`, request);
  }
  deleteSchedule(doctorId: number, id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/doctors/${doctorId}/availability/${id}`);
  }

  private updateDoctorLeaves(leaves: DoctorLeave[]): void {
    this.doctorLeaves.set(leaves);
    this.pendingLeaveCount.set(leaves.filter(leave => leave.status === 'PENDING').length);
  }
}
