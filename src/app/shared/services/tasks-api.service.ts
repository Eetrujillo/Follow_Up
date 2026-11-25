import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { BACKEND_API_URL } from './backend-api.config';

export type TaskOrigin = 'DASHBOARD' | 'CALENDAR';

export interface BackendTask {
  id: string;
  description: string;
  isCompleted: boolean;
  origin: TaskOrigin;
  dueDate: string | null;
  createdAt: string;
  completedAt: string | null;
}

/**
 * `origin` is absent on purpose: the backend decides it. A task created here is a
 * dashboard task, and a calendar task only exists together with its event.
 */
export interface CreateTaskRequest {
  description: string;
  dueDate?: string;
}

export interface UpdateTaskRequest {
  description?: string;
  dueDate?: string | null;
  isCompleted?: boolean;
}

@Injectable({ providedIn: 'root' })
export class TasksApiService {
  private readonly api = inject(ApiService);
  private readonly endpoint = `${BACKEND_API_URL}/tasks`;

  getAll(): Observable<BackendTask[]> {
    return this.api.get<BackendTask[]>(this.endpoint);
  }

  create(task: CreateTaskRequest): Observable<BackendTask> {
    return this.api.post<BackendTask>(this.endpoint, task);
  }

  update(id: string, changes: UpdateTaskRequest): Observable<BackendTask> {
    return this.api.patch<BackendTask>(`${this.endpoint}/${encodeURIComponent(id)}`, changes);
  }

  delete(id: string): Observable<BackendTask> {
    return this.api.delete<BackendTask>(`${this.endpoint}/${encodeURIComponent(id)}`);
  }
}