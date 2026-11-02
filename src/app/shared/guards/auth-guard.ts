import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';

/** Resolves the real session with the backend instead of trusting a client flag. */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.restore().pipe(
    map((user) => (user ? true : router.createUrlTree(['/login']))),
  );
};
