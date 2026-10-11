export type Role = 'PATIENT' | 'DOCTOR' | 'ADMIN';

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/** Matches the backend LoginResponse DTO. */
export interface LoginResponse {
  token: string;
  type: string;
  id: number;
  name: string;
  email: string;
  role: Role;
  profilePhotoUrl: string | null;
}

/** Shape of the error body returned by the backend GlobalExceptionHandler. */
export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  fieldErrors?: Record<string, string> | null;
}
