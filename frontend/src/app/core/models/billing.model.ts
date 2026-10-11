import { PaymentStatus } from './appointment.model';

export interface BillingResponse {
  id: number;
  appointmentId: number;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
  paidAt: string | null;
  refundedAt: string | null;
}
