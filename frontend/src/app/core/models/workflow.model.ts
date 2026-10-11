export interface DoctorLeave {
  id: number;
  doctorId: number;
  doctorName: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminComment: string | null;
  createdAt: string;
  decidedAt: string | null;
}

export type FeeRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface FeeChangeRequest {
  id: number;
  doctorId: number;
  doctorName: string;
  proposedFee: number;
  reason: string;
  status: FeeRequestStatus;
  adminComment: string | null;
  createdAt: string;
  decidedAt: string | null;
}

export interface Notification {
  id: number;
  type: string;
  message: string;
  referenceId: number | null;
  createdAt: string;
  readAt: string | null;
}

export interface DoctorReview {
  id: number;
  appointmentId: number;
  doctorId: number;
  doctorName: string;
  patientName: string;
  rating: number;
  comment: string | null;
  approved: boolean;
  createdAt: string;
}

export interface AdminReport {
  doctors: number;
  patients: number;
  appointments: number;
  upcomingAppointments: number;
  activeSchedules: number;
  pendingFeeRequests: number;
  unreadNotifications: number;
  pendingReviews: number;
  pendingPayments: number;
  paidPayments: number;
  refundedPayments: number;
  revenue: number;
}
