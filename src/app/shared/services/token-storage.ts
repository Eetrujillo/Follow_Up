import { Injectable } from '@angular/core';

const ACCESS_TOKEN_KEY = 'backend_access_token';

/** Single owner of the JWT so the interceptor and the services never disagree. */
@Injectable({ providedIn: 'root' })
export class TokenStorage {
  get(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  set(token: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  }

  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}
