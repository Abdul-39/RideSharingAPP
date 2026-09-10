import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getAccessToken();

  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && auth.getRefreshToken()) {
        return auth.refreshToken().pipe(
          switchMap(res => {
            if (res.success && res.data) {
              const retryReq = req.clone({
                setHeaders: { Authorization: `Bearer ${res.data.accessToken}` }
              });
              return next(retryReq);
            }
            auth.logout();
            return throwError(() => error);
          }),
          catchError(err => {
            auth.logout();
            return throwError(() => err);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
