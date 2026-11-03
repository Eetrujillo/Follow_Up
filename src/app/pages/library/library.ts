import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { LibraryService, Folder, Document } from '../../shared/services/library';

/**
 * Folders and documents come from the API. State that changes outside a DOM event
 * (the folder list, the selected ids resolved from it) is a signal because the
 * application runs zoneless.
 */
@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './library.html',
  styleUrl: './library.css'
})
export class Library implements OnInit {

  private readonly libraryService = inject(LibraryService);

  readonly folders = this.libraryService.folders;
  readonly view = signal<'folders' | 'documents' | 'editor'>('folders');
  readonly selectedFolderId = signal<string | null>(null);
  readonly selectedDocId = signal<string | null>(null);
  readonly errorMessage = signal('');

  readonly selectedFolder = computed<Folder | null>(
    () => this.folders().find((folder) => folder.id === this.selectedFolderId()) ?? null,
  );
  readonly selectedDoc = computed<Document | null>(
    () => this.selectedFolder()?.documents.find((doc) => doc.id === this.selectedDocId()) ?? null,
  );

  showFolderModal = false;
  showDocModal    = false;
  newFolderName   = '';
  newDocName      = '';

  editorContent = '';

  ngOnInit() {
    this.libraryService.reloadForUser();
  }

  openFolder(folder: Folder) {
    this.selectedFolderId.set(folder.id);
    this.selectedDocId.set(null);
    this.view.set('documents');
  }

  openDocument(doc: Document) {
    this.selectedDocId.set(doc.id);
    this.editorContent = doc.content;
    this.view.set('editor');
  }

  /** Breadcrumb "Follow-up" / "Biblioteca": back to the folder grid. */
  goHome() {
    if (this.view() === 'editor') {
      this.saveDocumentContent();
    }

    this.view.set('folders');
    this.selectedFolderId.set(null);
    this.selectedDocId.set(null);
  }

  /** Breadcrumb "{{ folder.name }}": back to the document list. */
  goToDocuments() {
    if (this.view() === 'editor') {
      this.saveDocumentContent();
    }

    this.selectedDocId.set(null);
    this.view.set('documents');
  }

  goBack() {
    if (this.view() === 'editor') {
      this.saveDocumentContent();
      this.selectedDocId.set(null);
      this.view.set('documents');
    } else if (this.view() === 'documents') {
      this.selectedFolderId.set(null);
      this.view.set('folders');
    }
  }

  openFolderModal() {
    this.newFolderName = '';
    this.showFolderModal = true;
  }

  saveFolder() {
    const name = this.newFolderName.trim();
    if (!name) return;

    this.run(this.libraryService.addFolder(name), () => (this.showFolderModal = false));
  }

  deleteFolder(id: string, e: MouseEvent) {
    e.stopPropagation();
    this.run(this.libraryService.deleteFolder(id));
  }

  openDocModal() {
    this.newDocName = '';
    this.showDocModal = true;
  }

  saveDoc() {
    const folder = this.selectedFolder();
    const name = this.newDocName.trim();
    if (!name || !folder) return;

    this.run(
      this.libraryService.addDocument(folder.id, name, ''),
      () => (this.showDocModal = false),
    );
  }

  deleteDocument(docId: string, e: MouseEvent) {
    e.stopPropagation();
    this.run(this.libraryService.deleteDocument(docId));
  }

  onSaveAndGoBack() {
    this.saveDocumentContent();
    this.goBack();
  }

  saveDocumentContent() {
    const doc = this.selectedDoc();
    if (!doc) return;

    this.run(this.libraryService.updateDocument(doc.id, this.editorContent));
  }

  /** One write against the API: clears the banner, then reports the failure if it comes. */
  private run(request: Observable<unknown>, onSuccess?: () => void) {
    this.errorMessage.set('');
    request.subscribe({
      next: () => onSuccess?.(),
      error: () => this.errorMessage.set('No se pudo guardar en el servidor. Intenta de nuevo.'),
    });
  }
}
