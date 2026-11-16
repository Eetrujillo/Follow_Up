import {
  Component,
  ElementRef,
  HostListener,
  Injector,
  OnDestroy,
  OnInit,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';

import { LibraryService, Folder, Document } from '../../shared/services/library';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './library.html',
  styleUrl: './library.css'
})
export class Library implements OnInit, OnDestroy {

  folders: Folder[] = [];

  view: 'folders' | 'documents' | 'editor' = 'folders';

  selectedFolder: Folder | null = null;
  selectedDoc:    Document | null = null;

  showFolderModal = false;
  showDocModal    = false;
  newFolderName   = '';
  newDocName      = '';

  editorContent = '';

  savedToast = false;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly injector = inject(Injector);
  readonly folderNameInput = viewChild<ElementRef<HTMLInputElement>>('folderNameInput');
  readonly docNameInput    = viewChild<ElementRef<HTMLInputElement>>('docNameInput');

  constructor(private libraryService: LibraryService, private router: Router) {}

  ngOnInit() {
    this.libraryService.folders$.subscribe(folders => {
      this.folders = folders;

      if (this.selectedFolder) {
        this.selectedFolder = folders.find(f => f.id === this.selectedFolder!.id) || null;
      }
    });
  }

  ngOnDestroy() {
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  /** Esc cierra el modal abierto (ningún efecto cuando no hay modal). */
  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.showFolderModal) {
      this.showFolderModal = false;
    } else if (this.showDocModal) {
      this.showDocModal = false;
    }
  }

  /** Teclado para la tarjeta de carpeta: ignora eventos que vienen de la papelera. */
  openFolderFromKey(e: Event, folder: Folder) {
    if ((e.target as HTMLElement) !== (e.currentTarget as HTMLElement)) return;
    e.preventDefault();
    this.openFolder(folder);
  }

  /** Teclado para la fila de documento: ignora eventos que vienen de la papelera. */
  openDocumentFromKey(e: Event, doc: Document) {
    if ((e.target as HTMLElement) !== (e.currentTarget as HTMLElement)) return;
    e.preventDefault();
    this.openDocument(doc);
  }

  openFolder(folder: Folder) {
    this.selectedFolder = folder;
    this.view = 'documents';
  }

  openDocument(doc: Document) {
    this.selectedDoc  = doc;
    this.editorContent = doc.content;
    this.view = 'editor';
  }

  goBack() {
    if (this.view === 'editor') {
      this.saveDocumentContent();
      this.view = 'documents';
      this.selectedDoc = null;
    } else if (this.view === 'documents') {
      this.view = 'folders';
      this.selectedFolder = null;
    }
  }

  openFolderModal() {
    this.newFolderName = '';
    this.showFolderModal = true;
    afterNextRender(() => this.folderNameInput()?.nativeElement.focus(), { injector: this.injector });
  }

  saveFolder() {
    if (!this.newFolderName.trim()) return;
    this.libraryService.addFolder(this.newFolderName.trim());
    this.showFolderModal = false;
  }

  deleteFolder(id: number, e: MouseEvent) {
    e.stopPropagation();
    this.libraryService.deleteFolder(id);
  }

  openDocModal() {
    this.newDocName = '';
    this.showDocModal = true;
    afterNextRender(() => this.docNameInput()?.nativeElement.focus(), { injector: this.injector });
  }

  saveDoc() {
    if (!this.newDocName.trim() || !this.selectedFolder) return;
    this.libraryService.addDocument(this.selectedFolder.id, this.newDocName.trim(), '');
    this.showDocModal = false;
  }

  deleteDocument(docId: number, e: MouseEvent) {
    e.stopPropagation();
    if (!this.selectedFolder) return;
    this.libraryService.deleteDocument(this.selectedFolder.id, docId);
  }

onSaveAndGoBack() {
  this.saveDocumentContent();
  this.goBack();
}
  saveDocumentContent() {
    if (!this.selectedFolder || !this.selectedDoc) return;
    this.libraryService.updateDocument(
      this.selectedFolder.id,
      this.selectedDoc.id,
      this.editorContent
    );
    this.notifySaved();
  }

  private notifySaved() {
    this.savedToast = true;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => (this.savedToast = false), 2400);
  }

}
