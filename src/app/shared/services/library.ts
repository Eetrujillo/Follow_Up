import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { StorageService } from './storage';

export interface Document {
  id: number;
  name: string;
  content: string;
  createdAt: string;
}

export interface Folder {
  id: number;
  name: string;
  documents: Document[];
}

@Injectable({
  providedIn: 'root'
})
export class LibraryService {

  private foldersSubject = new BehaviorSubject<Folder[]>([]);
  folders$ = this.foldersSubject.asObservable();

  constructor(private storage: StorageService) {
    const saved = this.storage.get<Folder[]>('library_folders', [
      { id: 1, name: 'Desarrollo Frontend',      documents: [] },
      { id: 2, name: 'Desarrollo Backend',       documents: [] },
      { id: 3, name: 'Bases de Datos',           documents: [] },
      { id: 4, name: 'Algoritmos',               documents: [] },
      { id: 5, name: 'Diseno UX/UI',             documents: [] },
      { id: 6, name: 'DevOps',                   documents: [] },
      { id: 7, name: 'Machine Learning',         documents: [] },
      { id: 8, name: 'Arquitectura de Software', documents: [] },
    ]);
    this.foldersSubject.next(saved);
  }

  getFolders(): Folder[] {
    return this.foldersSubject.getValue();
  }

  addFolder(name: string) {
    const folders = this.getFolders();
    folders.push({ id: Date.now(), name, documents: [] });
    this.save(folders);
  }

  deleteFolder(folderId: number) {
    const folders = this.getFolders().filter(f => f.id !== folderId);
    this.save(folders);
  }

  addDocument(folderId: number, name: string, content: string) {
    const folders = this.getFolders().map(f => {
      if (f.id === folderId) {
        f.documents.push({
          id: Date.now(),
          name,
          content,
          createdAt: new Date().toLocaleDateString('es-ES')
        });
      }
      return f;
    });
    this.save(folders);
  }

  updateDocument(folderId: number, docId: number, content: string) {
    const folders = this.getFolders().map(f => {
      if (f.id === folderId) {
        f.documents = f.documents.map(d =>
          d.id === docId ? { ...d, content } : d
        );
      }
      return f;
    });
    this.save(folders);
  }

  deleteDocument(folderId: number, docId: number) {
    const folders = this.getFolders().map(f => {
      if (f.id === folderId) {
        f.documents = f.documents.filter(d => d.id !== docId);
      }
      return f;
    });
    this.save(folders);
  }

  private save(folders: Folder[]) {
    this.foldersSubject.next(folders);
    this.storage.set('library_folders', folders);
  }
}