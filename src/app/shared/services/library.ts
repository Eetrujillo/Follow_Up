import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { StorageService } from './storage';
import { AuthService } from './auth.service';

export interface Document {
  id: number;
  name: string;
  content: string;
  createdAt: string;
  isNote?: boolean;
}

export interface Folder {
  id: number;
  name: string;
  documents: Document[];
  isNotesFolder?: boolean;
}

@Injectable({ providedIn: 'root' })
export class LibraryService {
  private readonly storage = inject(StorageService);
  private readonly authService = inject(AuthService);

  private readonly foldersSubject = new BehaviorSubject<Folder[]>([]);
  readonly folders$: Observable<Folder[]> = this.foldersSubject.asObservable();

  constructor() {
    this.loadFolders();
  }

  private get storageKey(): string {
    const user = this.authService.getCurrentUser();
    return `library_${user?.id || user?.email || 'guest'}`;
  }

  private loadFolders() {
    const saved = this.storage.get<Folder[]>(this.storageKey, [
      { id: 9, name: 'Mis Notas', documents: [], isNotesFolder: true },
    ]);
    this.foldersSubject.next(saved);
  }

  reloadForUser() {
    this.loadFolders();
  }

  getFolders(): Folder[] {
    return this.foldersSubject.getValue();
  }

  getNotesFolder(): Folder | undefined {
    return this.getFolders().find((folder) => folder.isNotesFolder);
  }

  addFolder(name: string) {
    const folders = [...this.getFolders(), { id: Date.now(), name, documents: [], isNotesFolder: false }];
    this.save(folders);
  }

  deleteFolder(folderId: number) {
    const folders = this.getFolders().filter((folder) => folder.id !== folderId || folder.isNotesFolder);
    this.save(folders);
  }

  addDocument(folderId: number, name: string, content: string, isNote = false) {
    const folders = this.getFolders().map((folder) => {
      if (folder.id === folderId) {
        return {
          ...folder,
          documents: [
            ...folder.documents,
            {
              id: Date.now(),
              name,
              content,
              createdAt: new Date().toLocaleDateString('es-ES'),
              isNote,
            },
          ],
        };
      }
      return folder;
    });
    this.save(folders);
  }

  saveNote(name: string, content: string) {
    const notesFolder = this.getNotesFolder();
    if (!notesFolder) return;
    this.addDocument(notesFolder.id, name, content, true);
  }

  updateDocument(folderId: number, docId: number, content: string) {
    const folders = this.getFolders().map((folder) => {
      if (folder.id !== folderId) return folder;

      return {
        ...folder,
        documents: folder.documents.map((document) =>
          document.id === docId ? { ...document, content } : document
        ),
      };
    });
    this.save(folders);
  }

  deleteDocument(folderId: number, docId: number) {
    const folders = this.getFolders().map((folder) => {
      if (folder.id !== folderId) return folder;

      return {
        ...folder,
        documents: folder.documents.filter((document) => document.id !== docId),
      };
    });
    this.save(folders);
  }

  async syncWithBackend(): Promise<Folder[]> {
    return this.getFolders();
  }

  private save(folders: Folder[]) {
    this.foldersSubject.next(folders);
    this.storage.set(this.storageKey, folders);
  }
}