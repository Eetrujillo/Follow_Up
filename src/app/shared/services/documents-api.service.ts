import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpParams } from '@angular/common/http';
import { ApiService } from './api.service';
import { BACKEND_API_URL } from './backend-api.config';
import { BackendDocument } from './folders-api.service';

export interface CreateDocumentRequest {
  folderId: string;
  title: string;
  contentHtml?: string;
  fromNotepad?: boolean;
}

export interface UpdateDocumentRequest {
  folderId?: string;
  title?: string;
  contentHtml?: string;
  fromNotepad?: boolean;
}

@Injectable({ providedIn: 'root' })
export class DocumentsApiService {
  private readonly api = inject(ApiService);
  private readonly endpoint = `${BACKEND_API_URL}/documents`;

  getAll(folderId?: string): Observable<BackendDocument[]> {
    return this.api.get<BackendDocument[]>(this.endpoint, {
      params: folderId ? new HttpParams().set('folderId', folderId) : undefined,
    });
  }

  getOne(id: string): Observable<BackendDocument> {
    return this.api.get<BackendDocument>(`${this.endpoint}/${encodeURIComponent(id)}`);
  }

  create(document: CreateDocumentRequest): Observable<BackendDocument> {
    return this.api.post<BackendDocument>(this.endpoint, document);
  }

  update(id: string, changes: UpdateDocumentRequest): Observable<BackendDocument> {
    return this.api.patch<BackendDocument>(`${this.endpoint}/${encodeURIComponent(id)}`, changes);
  }

  delete(id: string): Observable<BackendDocument> {
    return this.api.delete<BackendDocument>(`${this.endpoint}/${encodeURIComponent(id)}`);
  }
}
