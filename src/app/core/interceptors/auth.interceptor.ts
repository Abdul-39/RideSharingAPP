import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError, from } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Phase 3 — attaches JWT; on 401 tries refresh once; on failure logs out → login.
 * Does not attach token to refresh endpoint to avoid loops.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  const isRefresh = req.url.includes('/auth/refresh');
  const token = auth.getAccessToken();

  let authReq = req;
  if (token && !isRefresh) {
    authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isRefresh && auth.getRefreshToken()) {
        return auth.refreshToken().pipe(
          switchMap(res => {
            if (res.success && res.data?.accessToken) {
              const retryReq = req.clone({
                setHeaders: { Authorization: `Bearer ${res.data.accessToken}` }
              });
              return next(retryReq);
            }
            return from(auth.logout()).pipe(
              switchMap(() => throwError(() => error))
            );
          }),
          catchError(err =>
            from(auth.logout()).pipe(switchMap(() => throwError(() => err)))
          )
        );
      }
      return throwError(() => error);
    })
  );
};
