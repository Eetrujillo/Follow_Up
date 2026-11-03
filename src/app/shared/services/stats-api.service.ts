import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { BACKEND_API_URL } from './backend-api.config';

export interface BackendStreak {
  id: string | null;
  userId: string;
  lastVisitDate: string | null;
  currentStreakDays: number;
  updatedAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class StatsApiService {
  private readonly api = inject(ApiService);
  private readonly endpoint = `${BACKEND_API_URL}/stats`;

  getStreak(): Observable<BackendStreak> {
    return this.api.get<BackendStreak>(`${this.endpoint}/streak`);
  }

  registerVisit(): Observable<BackendStreak> {
    return this.api.post<BackendStreak>(`${this.endpoint}/visit`, {});
  }
}
