import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, switchMap, tap } from 'rxjs';
import { BackendDocument, BackendFolder, FoldersApiService } from './folders-api.service';
import { DocumentsApiService } from './documents-api.service';
import { htmlToText, textToHtml } from './html-text';

export interface Document {
  id: string;
  name: string;
  /** Plain text as the editor shows it; the API stores it as `contentHtml`. */
  content: string;
  createdAt: string;
  isNote: boolean;
}

export interface Folder {
  id: string;
  name: string;
  documents: Document[];
  isNotesFolder: boolean;
}

export const NOTES_FOLDER_NAME = 'Mis Notas';

function toDocument(document: BackendDocument): Document {
  return {
    id: document.id,
    name: document.title,
    content: htmlToText(document.contentHtml),
    createdAt: new Date(document.createdAt).toLocaleDateString('es-ES'),
    isNote: document.fromNotepad,
  };
}

function toFolder(folder: BackendFolder): Folder {
  return {
    id: folder.id,
    name: folder.name,
    documents: [...(folder.Document ?? [])].map(toDocument),
    isNotesFolder: folder.isNotesFolder,
  };
}

/**
 * Folders and documents live in PostgreSQL behind the API; the public surface is
 * the same the pages used with localStorage, so only the storage moved. State is
 * a signal because the application runs zoneless.
 */
@Injectable({ providedIn: 'root' })
export class LibraryService {
  private readonly foldersApi = inject(FoldersApiService);
  private readonly documentsApi = inject(DocumentsApiService);

  private readonly foldersSignal = signal<Folder[]>([]);
  readonly folders = this.foldersSignal.asReadonly();

  reloadForUser(): void {
    this.load().subscribe({ error: () => this.foldersSignal.set([]) });
  }

  getFolders(): Folder[] {
    return this.foldersSignal();
  }

  getNotesFolder(): Folder | undefined {
    return this.getFolders().find((folder) => folder.isNotesFolder);
  }

  addFolder(name: string): Observable<Folder[]> {
    return this.foldersApi
      .create({ name })
      .pipe(switchMap(() => this.load()));
  }

  deleteFolder(folderId: string): Observable<Folder[]> {
    if (this.getFolders().find((folder) => folder.id === folderId)?.isNotesFolder) {
      return this.load();
    }

    return this.foldersApi.delete(folderId).pipe(switchMap(() => this.load()));
  }

  addDocument(folderId: string, name: string, content: string, isNote = false): Observable<Folder[]> {
    return this.documentsApi
      .create({ folderId, title: name, contentHtml: textToHtml(content), fromNotepad: isNote })
      .pipe(switchMap(() => this.load()));
  }

  saveNote(name: string, content: string): Observable<Folder[]> {
    const notesFolder = this.getNotesFolder();
    if (!notesFolder) {
      return this.load();
    }

    return this.addDocument(notesFolder.id, name, content, true);
  }

  updateDocument(docId: string, content: string): Observable<Folder[]> {
    return this.documentsApi
      .update(docId, { contentHtml: textToHtml(content) })
      .pipe(switchMap(() => this.load()));
  }

  deleteDocument(docId: string): Observable<Folder[]> {
    return this.documentsApi.delete(docId).pipe(switchMap(() => this.load()));
  }

  /** First load also materialises the notes folder the UI expects to find. */
  private load(): Observable<Folder[]> {
    return this.foldersApi.getAll().pipe(
      switchMap((folders) => {
        if (folders.some((folder) => folder.isNotesFolder)) {
          return [folders];
        }

        return this.foldersApi
          .create({ name: NOTES_FOLDER_NAME, isNotesFolder: true })
          .pipe(switchMap(() => this.foldersApi.getAll()));
      }),
      map((folders) => folders.map(toFolder)),
      tap((folders) => this.foldersSignal.set(folders)),
    );
  }
}
