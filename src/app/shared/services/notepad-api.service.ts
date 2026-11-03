import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { BACKEND_API_URL } from './backend-api.config';

export interface BackendNotepadDraft {
  id: string | null;
  userId: string;
  contentHtml: string;
  lastModifiedAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class NotepadApiService {
  private readonly api = inject(ApiService);
  private readonly endpoint = `${BACKEND_API_URL}/notepad`;

  get(): Observable<BackendNotepadDraft> {
    return this.api.get<BackendNotepadDraft>(this.endpoint);
  }

  save(contentHtml: string): Observable<BackendNotepadDraft> {
    return this.api.put<BackendNotepadDraft>(this.endpoint, { contentHtml });
  }

  delete(): Observable<{ deleted: boolean }> {
    return this.api.delete<{ deleted: boolean }>(this.endpoint);
  }
}
