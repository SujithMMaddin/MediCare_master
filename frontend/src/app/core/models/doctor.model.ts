export interface Doctor {
  id: number;
  userId: number;
  name: string;
  email: string;
  specializationId: number;
  specialization: string;
  consultationFee: number | null;
  createdAt: string;
  profilePhotoUrl: string | null;
  bio: string | null;
  qualifications: string | null;
  experienceYears: number | null;
  phone: string | null;
  active: boolean;
  scheduleConfigured: boolean;
  averageRating: number | null;
  reviewCount: number;
}

export interface DoctorRequest {
  name: string;
  email: string;
  password: string;
  specializationId: number;
}
