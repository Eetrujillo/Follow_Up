import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { BACKEND_API_URL } from './backend-api.config';

export interface BackendUser {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
}

export interface CreateUserRequest {
  fullName: string;
  email: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class UsersApiService {
  private readonly api = inject(ApiService);
  private readonly endpoint = `${BACKEND_API_URL}/users`;

  create(request: CreateUserRequest): Observable<BackendUser> {
    return this.api.post<BackendUser>(this.endpoint, request);
  }

  getById(id: string): Observable<BackendUser> {
    return this.api.get<BackendUser>(`${this.endpoint}/${encodeURIComponent(id)}`);
  }
}