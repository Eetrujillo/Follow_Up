import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';

import { LibraryService, Folder, Document } from '../../shared/services/library';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './library.html',
  styleUrl: './library.css',
})
export class Library implements OnInit {
  folders: Folder[] = [];

  view: 'folders' | 'documents' | 'editor' = 'folders';

  selectedFolder: Folder | null = null;
  selectedDoc: Document | null = null;

  showFolderModal = false;
  showDocModal = false;
  showCalendarModal = false; // nuevo modal para elegir fecha
  newFolderName = '';
  newDocName = '';
  selectedDate: string = ''; // fecha seleccionada por el usuario

  editorContent = '';

  constructor(
    private libraryService: LibraryService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.libraryService.folders$.subscribe((folders) => {
      this.folders = folders;

      if (this.selectedFolder) {
        this.selectedFolder = folders.find((f) => f.id === this.selectedFolder!.id) || null;
      }
    });
  }

  openFolder(folder: Folder) {
    this.selectedFolder = folder;
    this.view = 'documents';
  }

  openDocument(doc: Document) {
    // este metodo sirve tanto para abrir como para editar
    this.selectedDoc = doc;
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
      this.editorContent,
    );
  }

  // ahora abre el modal para elegir la fecha
  sendDocToCalendar(doc: Document) {
    this.selectedDoc = doc;
    this.showCalendarModal = true;
  }

  // aqui construi la fecha manualmente para evitar desfase de un día
  confirmSendToCalendar() {
    if (this.selectedDoc && this.selectedDate) {
      const [yearStr, monthStr, dayStr] = this.selectedDate.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10) - 1;
      const day = parseInt(dayStr, 10);
      const date = new Date(year, month, day, 12, 0, 0);
      this.libraryService.addDocumentToCalendar(this.selectedDoc, date);
      this.showCalendarModal = false;
      this.selectedDoc = null;
      this.selectedDate = '';
    }
  }
}
