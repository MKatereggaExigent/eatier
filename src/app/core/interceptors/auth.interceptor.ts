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

  // Skip interceptor for external APIs (geolocation, etc.)
  const externalDomains = ['ipapi.co', 'api.country.is', 'maps.googleapis.com'];
  const isExternalRequest = externalDomains.some(domain => req.url.includes(domain));

  if (isExternalRequest) {
    // Don't add credentials or auth headers to external requests
    return next(req);
  }

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
      // List of public endpoints that should NOT trigger auth redirects
      const publicEndpoints = [
        '/auth/login',
        '/auth/register',
        '/auth/refresh',
        '/businesses',  // Public business discovery
        '/specialists',  // Public specialist discovery
        '/public/specialists',  // Public specialist discovery (alternative endpoint)
        '/blog',  // Public blog
        '/ads-public',  // Public ads
        '/public',  // Other public endpoints
        '/reviews/business',  // Public reviews for businesses
        '/menus/business'  // Public menus for businesses
      ];

      // Check if this is a public endpoint
      const isPublicEndpoint = publicEndpoints.some(endpoint => req.url.includes(endpoint));

      // If we get a 401 error and it's not a public endpoint
      if (error.status === 401 && !isPublicEndpoint) {
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

