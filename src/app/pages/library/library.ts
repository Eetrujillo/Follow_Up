import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LibraryService, Folder, Document } from '../../shared/services/library';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './library.html',
  styleUrl: './library.css'
})
export class Library implements OnInit {

  folders: Folder[] = [];

  // Vista actual: 'folders' | 'documents' | 'editor'
  view: 'folders' | 'documents' | 'editor' = 'folders';

  selectedFolder: Folder | null = null;
  selectedDoc:    Document | null = null;

  // Modales
  showFolderModal = false;
  showDocModal    = false;
  newFolderName   = '';
  newDocName      = '';

  // Editor
  editorContent = '';

  constructor(private libraryService: LibraryService) {}

  ngOnInit() {
    this.libraryService.folders$.subscribe(folders => {
      this.folders = folders;
      // Actualizar carpeta seleccionada si cambio
      if (this.selectedFolder) {
        this.selectedFolder = folders.find(f => f.id === this.selectedFolder!.id) || null;
      }
    });
  }

  // ── Navegacion ────────────────────────────────────────
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

  // ── Carpetas ──────────────────────────────────────────
  openFolderModal() {
    this.newFolderName = '';
    this.showFolderModal = true;
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

  // ── Documentos ────────────────────────────────────────
  openDocModal() {
    this.newDocName = '';
    this.showDocModal = true;
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

  // ── Editor ────────────────────────────────────────────
  saveDocumentContent() {
    if (!this.selectedFolder || !this.selectedDoc) return;
    this.libraryService.updateDocument(
      this.selectedFolder.id,
      this.selectedDoc.id,
      this.editorContent
    );
  }
}