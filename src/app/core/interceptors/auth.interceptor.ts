import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { inject } from '@angular/core';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Get token from localStorage
  const token = localStorage.getItem('itiyum_token');

  // Clone request to add credentials (cookies) and Authorization header
  let authReq = req.clone({
    withCredentials: true
  });

  // Add Authorization header if token exists
  if (token) {
    authReq = authReq.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // If we get a 401 error and it's not a login/register/refresh request
      if (
        error.status === 401 &&
        !req.url.includes('/auth/login') &&
        !req.url.includes('/auth/register') &&
        !req.url.includes('/auth/refresh')
      ) {
        // Try to refresh the token
        return authService.refreshToken().pipe(
          switchMap(() => {
            // Get the new token
            const newToken = localStorage.getItem('itiyum_token');

            // Retry the original request with new token
            let retryReq = req.clone({
              withCredentials: true
            });

            if (newToken) {
              retryReq = retryReq.clone({
                setHeaders: {
                  Authorization: `Bearer ${newToken}`
                }
              });
            }

            return next(retryReq);
          }),
          catchError((refreshError) => {
            // If refresh fails, logout and redirect to login
            authService.logout();
            router.navigate(['/login']);
            return throwError(() => refreshError);
          })
        );
      }

      return throwError(() => error);
    })
  );
};

