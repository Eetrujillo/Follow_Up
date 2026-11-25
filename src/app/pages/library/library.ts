import {
  ChangeDetectorRef,
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
import { flip, observeReveals, prefersReducedMotion } from '../../shared/motion/motion';

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
  /** Salida del aviso: la clase arranca la transición y `transitionend` desmonta. */
  toastLeaving = false;

  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private stopReveals: () => void = () => {};

  private readonly injector = inject(Injector);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly gridEl = viewChild<ElementRef<HTMLElement>>('folderGrid');
  readonly docTitleEl = viewChild<ElementRef<HTMLElement>>('docTitle');
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
    this.stopReveals();
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
    this.openFolder(folder, e.currentTarget as HTMLElement);
  }

  /** Click sobre la tarjeta: ella misma es el origen del morph. */
  openFolderFromClick(e: MouseEvent, folder: Folder) {
    this.openFolder(folder, e.currentTarget as HTMLElement);
  }

  /**
   * Morph carpeta → documentos. El nombre de la transición sólo puede existir una
   * vez en el documento: se pone en la tarjeta antes del snapshot viejo, el estado
   * nuevo se commitea dentro del callback y el nombre se retira siempre al final.
   * Sin la API, o con movimiento reducido, el estado cambia igual y sin morph.
   */
  openFolder(folder: Folder, card?: HTMLElement | null) {
    if (!card || typeof document.startViewTransition !== 'function' || prefersReducedMotion()) {
      this.showDocuments(folder, false);
      return;
    }

    card.classList.add('m-morph');
    const transition = document.startViewTransition(() => this.showDocuments(folder, true));
    void transition.finished.finally(() => {
      card.classList.remove('m-morph');
      this.docTitleEl()?.nativeElement.classList.remove('m-morph');
    });
  }

  /** Vuelve a la grilla desde las migas: mismas dos asignaciones que antes. */
  openFoldersRoot() {
    this.view = 'folders';
    this.selectedFolder = null;
    this.revealFolders();
  }

  openDocument(doc: Document) {
    this.selectedDoc  = doc;
    this.editorContent = doc.content;
    this.view = 'editor';
  }

  /** Teclado para la fila de documento: mismo contrato que la tarjeta de carpeta. */
  openDocumentFromKey(e: Event, doc: Document) {
    if ((e.target as HTMLElement) !== (e.currentTarget as HTMLElement)) return;
    e.preventDefault();
    this.openDocument(doc);
  }

  goBack() {
    if (this.view === 'editor') {
      this.saveDocumentContent();
      this.view = 'documents';
      this.selectedDoc = null;
    } else if (this.view === 'documents') {
      this.openFoldersRoot();
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

  /** La grilla cierra el hueco con `transform`: FLIP sobre las tarjetas que quedan. */
  deleteFolder(id: number, e: MouseEvent) {
    e.stopPropagation();
    const grid = this.gridEl()?.nativeElement;
    if (!grid) {
      this.libraryService.deleteFolder(id);
      return;
    }
    flip(grid, () => {
      this.libraryService.deleteFolder(id);
      // FLIP mide después de mutar: el DOM tiene que estar actualizado ya.
      this.cdr.detectChanges();
    });
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

  /** La duración de la salida del aviso la pone el token en CSS, no el TS. */
  onToastExit(e: TransitionEvent) {
    if (!this.toastLeaving || e.propertyName !== 'opacity') return;
    this.toastLeaving = false;
    this.savedToast = false;
  }

  private showDocuments(folder: Folder, morph: boolean) {
    this.selectedFolder = folder;
    this.view = 'documents';
    // El snapshot nuevo se toma cuando resuelve el callback: la vista tiene que
    // estar commiteada y el título es el destino del nombre de la transición.
    this.cdr.detectChanges();
    if (morph) this.docTitleEl()?.nativeElement.classList.add('m-morph');
  }

  /**
   * Las tarjetas se re-crean al volver de una carpeta. El observer compartido sólo
   * se re-arma en cada navegación de ruta, así que acá se vuelve a pedir: sin esto
   * la grilla quedaría esperando el `.is-in` que reparte el escalonado.
   */
  private revealFolders() {
    afterNextRender(() => {
      this.stopReveals();
      this.stopReveals = observeReveals();
    }, { injector: this.injector });
  }

  private notifySaved() {
    this.savedToast = true;
    this.toastLeaving = false;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.startToastExit(), 2400);
  }

  /** Sin capa de movimiento no hay transición que esperar: se desmonta en el acto. */
  private startToastExit() {
    if (prefersReducedMotion() || document.documentElement.dataset['motion'] !== 'on') {
      this.savedToast = false;
      return;
    }
    this.toastLeaving = true;
  }

}
