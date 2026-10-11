export type PatientRelationship = 'SELF' | 'PARENT' | 'SPOUSE' | 'CHILD' | 'OTHER';

export interface PatientProfile {
  id: number;
  fullName: string;
  dateOfBirth: string | null;
  relationship: PatientRelationship;
  self: boolean;
}

export interface PatientProfileRequest {
  fullName: string;
  dateOfBirth: string;
  relationship: Exclude<PatientRelationship, 'SELF'>;
}
