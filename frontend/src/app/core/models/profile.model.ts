import { Role } from './auth.model';

export interface ProfileScheduleEntry {
  id: number;
  doctorId: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
}

export interface Profile {
  id: number;
  name: string;
  email: string;
  profilePhotoUrl: string | null;
  role: Role;
  doctorId: number | null;
  specialization: string | null;
  consultationFee: number | null;
  schedule: ProfileScheduleEntry[];
  bio: string | null;
  qualifications: string | null;
  experienceYears: number | null;
  phone: string | null;
  active: boolean;
  averageRating: number | null;
  reviewCount: number;
}

export interface ProfileUpdateResult {
  profile: Profile;
  session: import('./auth.model').LoginResponse;
}
