import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { StorageService } from './storage';
import { AuthService } from './auth.service';
import { TaskService } from './task';

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
  private foldersSubject = new BehaviorSubject<Folder[]>([]);
  folders$ = this.foldersSubject.asObservable();

  constructor(
    private storage: StorageService,
    private authService: AuthService,
    private taskService: TaskService,
  ) {
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
    return this.getFolders().find((f) => f.isNotesFolder);
  }

  addFolder(name: string) {
    const folders = this.getFolders();
    folders.push({ id: Date.now(), name, documents: [], isNotesFolder: false });
    this.save(folders);
  }

  deleteFolder(folderId: number) {
    const folders = this.getFolders().filter((f) => f.id !== folderId || f.isNotesFolder);
    this.save(folders);
  }

  addDocument(folderId: number, name: string, content: string, isNote = false) {
    const folders = this.getFolders().map((f) => {
      if (f.id === folderId) {
        f.documents.push({
          id: Date.now(),
          name,
          content,
          createdAt: new Date().toLocaleDateString('es-ES'),
          isNote,
        });
      }
      return f;
    });
    this.save(folders);
  }

  saveNote(name: string, content: string) {
    const notesFolder = this.getNotesFolder();
    if (!notesFolder) return;
    this.addDocument(notesFolder.id, name, content, true);
  }

  updateDocument(folderId: number, docId: number, content: string) {
    const folders = this.getFolders().map((f) => {
      if (f.id === folderId) {
        f.documents = f.documents.map((d) => (d.id === docId ? { ...d, content } : d));
      }
      return f;
    });
    this.save(folders);
  }

  deleteDocument(folderId: number, docId: number) {
    const folders = this.getFolders().map((f) => {
      if (f.id === folderId) {
        f.documents = f.documents.filter((d) => d.id !== docId);
      }
      return f;
    });
    this.save(folders);
  }

  // le cambie que ahora se pudiera usar la fecha seleccionada por el usuario
  addDocumentToCalendar(doc: Document, date: Date) {
    const newEvent = {
      id: Date.now(),
      day: date.getDate(),
      month: date.getMonth(),
      year: date.getFullYear(),
      title: doc.name,
      color: '#10b981',
    };

    const events = this.storage.get<any[]>('calendar_events', []);
    events.push(newEvent);
    this.storage.set('calendar_events', events);

    const dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    this.taskService.addTask(`${doc.name} (${dateStr})`, 'calendar', dateStr);
  }

  private save(folders: Folder[]) {
    this.foldersSubject.next(folders);
    this.storage.set(this.storageKey, folders);
  }
}
