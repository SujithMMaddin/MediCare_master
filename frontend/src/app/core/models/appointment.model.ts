export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW';

export type PaymentStatus = 'PENDING' | 'PAID' | 'REFUNDED';

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  'PENDING',
  'CONFIRMED',
  'REJECTED',
  'CANCELLED',
  'COMPLETED',
  'NO_SHOW'
];

export interface AppointmentRequest {
  doctorId: number;
  patientProfileId: number;
  specializationId?: number;
  appointmentDate: string;
  reason?: string;
}

export interface AppointmentResponse {
  id: number;
  appointmentDate: string;
  status: AppointmentStatus;
  reason: string | null;

  bookingAccountId: number;
  bookingAccountName: string;
  bookingAccountEmail: string;
  patientProfileId: number | null;
  patientName: string;
  patientRelationship: string;

  doctorId: number;
  doctorName: string;
  doctorEmail: string;

  specializationId: number;
  specialization: string;

  createdAt: string;
  noShowEligibleAt: string | null;
  consultationFee: number | null;
  totalAmount: number | null;
  paymentStatus: PaymentStatus;
  billingId: number | null;
  scheduleConflict: boolean;
}
