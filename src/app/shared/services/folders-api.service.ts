import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { BACKEND_API_URL } from './backend-api.config';

export interface BackendFolder {
  id: string;
  userId: string;
  name: string;
  isNotesFolder: boolean;
  createdAt: string;
  /** Folders come back with their documents already included by the backend. */
  Document: BackendDocument[];
}

export interface BackendDocument {
  id: string;
  folderId: string;
  userId: string;
  title: string;
  contentHtml: string;
  fromNotepad: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFolderRequest {
  name: string;
  isNotesFolder?: boolean;
}

export interface UpdateFolderRequest {
  name?: string;
  isNotesFolder?: boolean;
}

@Injectable({ providedIn: 'root' })
export class FoldersApiService {
  private readonly api = inject(ApiService);
  private readonly endpoint = `${BACKEND_API_URL}/folders`;

  getAll(): Observable<BackendFolder[]> {
    return this.api.get<BackendFolder[]>(this.endpoint);
  }

  create(folder: CreateFolderRequest): Observable<BackendFolder> {
    return this.api.post<BackendFolder>(this.endpoint, folder);
  }

  update(id: string, changes: UpdateFolderRequest): Observable<BackendFolder> {
    return this.api.patch<BackendFolder>(`${this.endpoint}/${encodeURIComponent(id)}`, changes);
  }

  delete(id: string): Observable<BackendFolder> {
    return this.api.delete<BackendFolder>(`${this.endpoint}/${encodeURIComponent(id)}`);
  }
}
