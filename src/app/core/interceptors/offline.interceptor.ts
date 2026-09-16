import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { NetworkService } from '../services/network.service';

/**
 * Phase 14 — block mutating API calls while offline; fail fast with a clear error.
 * GET can still be attempted (may use browser cache); POST/PUT/PATCH/DELETE are blocked.
 */
export const offlineInterceptor: HttpInterceptorFn = (req, next) => {
  const network = inject(NetworkService);
  const method = req.method.toUpperCase();
  const mutating = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';

  if (mutating && !network.online()) {
    return throwError(
      () =>
        new HttpErrorResponse({
          status: 0,
          statusText: 'Offline',
          error: { message: 'You are offline. Reconnect to perform this action.' },
          url: req.url
        })
    );
  }

  return next(req);
};
