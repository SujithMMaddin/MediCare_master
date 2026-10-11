import { HttpErrorResponse } from '@angular/common/http';
import { ApiError } from '../models/auth.model';

/** Turns any HTTP error from the backend into a friendly, displayable message. */
export function extractErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return 'Cannot reach the server. Please make sure the backend is running.';
    }
    const body = err.error as ApiError | null;
    if (body?.fieldErrors && Object.keys(body.fieldErrors).length > 0) {
      return Object.values(body.fieldErrors).join('. ');
    }
    if (body?.message) {
      return body.message;
    }
  }
  return 'Something went wrong. Please try again.';
}
