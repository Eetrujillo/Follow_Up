import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { BACKEND_API_URL } from './backend-api.config';
import { BackendTask } from './tasks-api.service';

export interface BackendCalendarEvent {
  id: string;
  title: string;
  colorHex: string;
  eventDate: string;
  linkedTaskId: string | null;
  createdAt: string;
  Task?: BackendTask | null;
}

export interface CreateCalendarEventRequest {
  title: string;
  colorHex?: string;
  day: number;
  month: number;
  year: number;
}

@Injectable({ providedIn: 'root' })
export class CalendarApiService {
  private readonly api = inject(ApiService);
  private readonly endpoint = `${BACKEND_API_URL}/calendar`;

  getAll(): Observable<BackendCalendarEvent[]> {
    return this.api.get<BackendCalendarEvent[]>(this.endpoint);
  }

  create(event: CreateCalendarEventRequest): Observable<BackendCalendarEvent> {
    return this.api.post<BackendCalendarEvent>(this.endpoint, event);
  }

  delete(id: string): Observable<BackendCalendarEvent> {
    return this.api.delete<BackendCalendarEvent>(`${this.endpoint}/${encodeURIComponent(id)}`);
  }
}