import { HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap, throwError } from 'rxjs';
import { ApiService } from './api.service';
import { BACKEND_API_URL } from './backend-api.config';
import { BackendUser } from './users-api.service';

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthRegistrationResponse {
  user: BackendUser;
  token: string;
}

export interface AuthLoginResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
}

const ACCESS_TOKEN_KEY = 'backend_access_token';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly api = inject(ApiService);
  private readonly endpoint = `${BACKEND_API_URL}/auth`;

  register(request: RegisterRequest): Observable<AuthRegistrationResponse> {
    return this.api
      .post<AuthRegistrationResponse>(`${this.endpoint}/register`, request)
      .pipe(tap(({ token }) => this.storeToken(token)));
  }

  login(request: LoginRequest): Observable<AuthLoginResponse> {
    return this.api
      .post<AuthLoginResponse>(`${this.endpoint}/login`, request)
      .pipe(tap(({ access_token }) => this.storeToken(access_token)));
  }

  me(): Observable<BackendUser> {
    const token = this.getAccessToken();
    if (!token) {
      return throwError(() => new Error('No hay una sesión autenticada'));
    }

    return this.api.get<BackendUser>(`${this.endpoint}/me`, {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
    });
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  logout(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }

  private storeToken(token: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  }
}