import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Role } from '../models/auth.model';

/**
 * Role based route protection. Usage in routes:
 *   canActivate: [authGuard, roleGuard], data: { role: 'ADMIN' }
 */
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const required = route.data['role'] as Role | undefined;
  const user = auth.currentUser();

  if (!user) {
    return router.createUrlTree(['/login']);
  }
  if (required && !auth.hasRole(required)) {
    return router.createUrlTree([auth.homeRoute()]);
  }
  return true;
};
