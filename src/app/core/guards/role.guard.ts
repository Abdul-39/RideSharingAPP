import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const requiredRoles = route.data['roles'] as string[] | undefined;

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth']);
  }

  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }

  const hasRole = requiredRoles.some(role => auth.hasRole(role));
  if (hasRole) {
    return true;
  }

  return router.createUrlTree(['/']);
};
