import {
  ActivatedRouteSnapshot,
  CanActivate,
  CanActivateChild,
  Router,
  RouterStateSnapshot,
  UrlTree
} from '@angular/router';
import { Injectable, inject } from '@angular/core';
import { map, take } from 'rxjs/operators';

import { AuthService } from '../services/auth.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate, CanActivateChild {
  private authService = inject(AuthService);
  private router = inject(Router);

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return this.checkAuth(state.url);
  }

  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return this.checkAuth(state.url);
  }

  private checkAuth(url: string): Observable<boolean | UrlTree> {
    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        if (user) {
          return true;
        } else {
          // Store the attempted URL for redirecting after login
          localStorage.setItem('itiyum_redirect_url', url);
          return this.router.createUrlTree(['/login']);
        }
      })
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate, CanActivateChild {
  private authService = inject(AuthService);
  private router = inject(Router);

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return this.checkRole(route, state.url);
  }

  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return this.checkRole(childRoute, state.url);
  }

  private checkRole(route: ActivatedRouteSnapshot, url: string): Observable<boolean | UrlTree> {
    const requiredRoles = route.data['roles'] as string[];
    const requiredPermissions = route.data['permissions'] as string[];

    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        if (!user) {
          localStorage.setItem('itiyum_redirect_url', url);
          return this.router.createUrlTree(['/login']);
        }

        // Check role-based access
        if (requiredRoles && requiredRoles.length > 0) {
          if (!requiredRoles.includes(user.role)) {
            return this.router.createUrlTree(['/unauthorized']);
          }
        }

        // Check permission-based access
        if (requiredPermissions && requiredPermissions.length > 0) {
          const hasPermission = requiredPermissions.some(permission =>
            this.authService.hasPermission(permission)
          );

          if (!hasPermission) {
            return this.router.createUrlTree(['/unauthorized']);
          }
        }

        // Check route-specific access
        if (!this.authService.canAccessRoute(url)) {
          return this.router.createUrlTree(['/unauthorized']);
        }

        return true;
      })
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class GuestGuard implements CanActivate {
  private authService = inject(AuthService);
  private router = inject(Router);

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        if (user) {
          // User is already authenticated, redirect to appropriate dashboard
          return this.getDashboardRoute(user.role);
        } else {
          return true;
        }
      })
    );
  }

  private getDashboardRoute(role: string): UrlTree {
    switch (role) {
      case 'itiyum_admin':
        return this.router.createUrlTree(['/admin']);
      case 'business_owner':
        return this.router.createUrlTree(['/dashboard/business']);
      case 'food_enthusiast':
        return this.router.createUrlTree(['/dashboard/food-enthusiast']);
      case 'normal_user':
        return this.router.createUrlTree(['/dashboard/user']);
      case 'specialist':
        return this.router.createUrlTree(['/dashboard/specialist']);
      default:
        return this.router.createUrlTree(['/']);
    }
  }
}
