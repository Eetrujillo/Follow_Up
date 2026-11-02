import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { BACKEND_API_URL } from './backend-api.config';
import { SessionUser } from './session-user';
import { TokenStorage } from './token-storage';

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
  user: SessionUser;
  token: string;
}

export interface AuthLoginResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly api = inject(ApiService);
  private readonly tokenStorage = inject(TokenStorage);
  private readonly endpoint = `${BACKEND_API_URL}/auth`;

  register(request: RegisterRequest): Observable<AuthRegistrationResponse> {
    return this.api.post<AuthRegistrationResponse>(`${this.endpoint}/register`, request);
  }

  login(request: LoginRequest): Observable<AuthLoginResponse> {
    return this.api
      .post<AuthLoginResponse>(`${this.endpoint}/login`, request)
      .pipe(tap(({ access_token }) => this.tokenStorage.set(access_token)));
  }

  me(): Observable<SessionUser> {
    return this.api.get<SessionUser>(`${this.endpoint}/me`);
  }

  getAccessToken(): string | null {
    return this.tokenStorage.get();
  }

  logout(): void {
    this.tokenStorage.clear();
  }
}
