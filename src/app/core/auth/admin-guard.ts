import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth-service';

export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ready;
  // Revalidate on each entry, including after expiration in another tab.
  await auth.refresh();
  return auth.isAdmin() || router.createUrlTree(['/acceso']);
};
