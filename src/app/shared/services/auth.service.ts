import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, switchMap, tap, throwError } from 'rxjs';
import { AuthApiService } from './auth-api.service';
import { SessionUser } from './session-user';
import { TokenStorage } from './token-storage';

const CURRENT_USER_KEY = 'current_user';

/**
 * Session facade over the backend. The JWT is the source of truth: `restore()`
 * resolves the real user through `GET /auth/me` and drops a stale token.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authApi = inject(AuthApiService);
  private readonly tokenStorage = inject(TokenStorage);
  private currentUser: SessionUser | null = null;

  login(email: string, password: string): Observable<boolean> {
    if (!email || !password) {
      return throwError(() => new Error('Correo y contrasena son obligatorios'));
    }

    return this.authApi.login({ email, password }).pipe(
      switchMap(() => this.authApi.me()),
      tap((user) => this.setCurrentUser(user)),
      map(() => true),
      catchError(() => {
        this.logout();
        return of(false);
      }),
    );
  }

  restore(): Observable<SessionUser | null> {
    if (!this.tokenStorage.get()) {
      return of(null);
    }

    const saved = this.getCurrentUser();
    if (saved) {
      return of(saved);
    }

    return this.authApi.me().pipe(
      tap((user) => this.setCurrentUser(user)),
      catchError(() => {
        this.logout();
        return of(null);
      }),
    );
  }

  logout(): void {
    this.currentUser = null;
    this.authApi.logout();
    localStorage.removeItem(CURRENT_USER_KEY);
  }

  isLoggedIn(): boolean {
    return this.tokenStorage.get() !== null;
  }

  getCurrentUser(): SessionUser | null {
    if (this.currentUser) {
      return this.currentUser;
    }

    const saved = localStorage.getItem(CURRENT_USER_KEY);
    if (!saved) {
      return null;
    }

    try {
      this.currentUser = JSON.parse(saved) as SessionUser;
      return this.currentUser;
    } catch {
      localStorage.removeItem(CURRENT_USER_KEY);
      return null;
    }
  }

  private setCurrentUser(user: SessionUser): void {
    this.currentUser = user;
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  }
}
