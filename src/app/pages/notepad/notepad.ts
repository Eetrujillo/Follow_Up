import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StorageService } from '../../shared/services/storage';
import { LibraryService } from '../../shared/services/library';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-notepad',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notepad.html',
  styleUrl: './notepad.css',
})
export class Notepad implements AfterViewInit {
  @ViewChild('editor', { static: true }) editorRef!: ElementRef<HTMLElement>;

  saved = false;
  showSaveModal = false;
  noteName = '';

  maxChars = 3000;
  charCount = 0;
  isOverLimit = false;

  private get storageKey(): string {
    const user = this.authService.getCurrentUser();
    return `notepad_${user?.id || user?.email || 'guest'}`;
  }

  get hasContent(): boolean {
    return !!this.editorRef?.nativeElement?.innerText?.trim();
  }

  constructor(
    private storage: StorageService,
    private libraryService: LibraryService,
    private authService: AuthService,
  ) {}

  ngAfterViewInit() {
    // Cargar contenido guardado (texto plano)
    const saved = this.storage.get<string>(this.storageKey, '');
    if (saved) {
      this.editorRef.nativeElement.innerText = saved;
    }
    this.updateCharCount();
  }

  // Actualiza contador y estado de límite
  private updateCharCount() {
    const text = this.editorRef.nativeElement.innerText || '';
    this.charCount = text.length;
    this.isOverLimit = this.charCount > this.maxChars;
    if (this.isOverLimit) {
      this.editorRef.nativeElement.classList.add('over-limit');
    } else {
      this.editorRef.nativeElement.classList.remove('over-limit');
    }
  }

  format(command: string, value?: string) {
    document.execCommand(command, false, value);
    this.editorRef.nativeElement.focus();
    this.onContentChange();
  }

  isActive(command: string): boolean {
    return document.queryCommandState(command);
  }

  onSelectionChange() {
  }

  // Guarda localmente como texto plano y mantiene el límite
  onContentChange() {
    const text = this.editorRef.nativeElement.innerText || '';

    // Si supera el límite, recortar y colocar caret al final
    if (text.length > this.maxChars) {
      const truncated = text.substring(0, this.maxChars);
      this.editorRef.nativeElement.innerText = truncated;
      this.placeCaretAtEnd(this.editorRef.nativeElement);
    }

    this.updateCharCount();
    this.storage.set(this.storageKey, this.editorRef.nativeElement.innerText);
    this.saved = false;
  }

  openSaveModal() {
    this.noteName = '';
    this.showSaveModal = true;
  }

  // Al guardar en biblioteca se convierte el HTML 
  saveToLibrary() {
    if (!this.noteName.trim()) return;
    const rawHtml = this.editorRef.nativeElement.innerHTML;
    const contentPlain = this.htmlToPlainText(rawHtml);
    this.libraryService.saveNote(this.noteName.trim(), contentPlain);
    this.showSaveModal = false;
    this.saved = true;
    setTimeout(() => (this.saved = false), 2000);
  }

  onEditorKeyDown(e: KeyboardEvent) {
    const key = e.key;

    const controlKeys = [
      'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight',
      'ArrowUp', 'ArrowDown', 'Home', 'End', 'Tab', 'Escape'
    ];

    if (key === 'Enter') {
      e.preventDefault();

      this.insertHtmlAtCursor('<br><br>');
      this.onContentChange();
      return;
    }

    // Permitir teclas de control y combinaciones 
    if (controlKeys.includes(key) || e.ctrlKey ) {
      return;
    }

    // Bloquear entrada imprimible si se alcanzó el límite
    const isPrintable = key.length === 1;
    if (isPrintable) {
      const current = this.editorRef.nativeElement.innerText || '';
      if (current.length >= this.maxChars) {
        e.preventDefault();
        return;
      }
    }

  }

  // Manejo de pegado: insertar solo texto plano y truncar si es necesario
  onEditorPaste(e: ClipboardEvent) {
    e.preventDefault();
    const pasteText = (e.clipboardData?.getData('text') || '');
    const current = this.editorRef?.nativeElement?.innerText || '';
    const available = Math.max(0, this.maxChars - current.length);
    if (available <= 0) return;
    const toInsert = pasteText.substring(0, available);
    if (toInsert.length > 0) {
      this.insertTextAtCursor(toInsert);
      this.onContentChange();
    }
  }

  // Inserta HTML en la posición del caret 
  private insertHtmlAtCursor(html: string) {
    const sel = window.getSelection();
    if (!sel) {
      this.editorRef.nativeElement.insertAdjacentHTML('beforeend', html);
      this.placeCaretAtEnd(this.editorRef.nativeElement);
      return;
    }

    if (sel.rangeCount === 0) {
      this.editorRef.nativeElement.insertAdjacentHTML('beforeend', html);
      this.placeCaretAtEnd(this.editorRef.nativeElement);
      return;
    }
    // Crear un fragmento a partir del HTML y reemplazar la selección
    const range = sel.getRangeAt(0);
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const frag = document.createDocumentFragment();
    const nodes: ChildNode[] = [];
    let node: ChildNode | null;
    while ((node = temp.firstChild)) {
      nodes.push(node);
      frag.appendChild(node);
    }

    range.deleteContents();
    range.insertNode(frag);
    // Mover caret después del contenido insertado
    const lastNode = nodes[nodes.length - 1];
    if (lastNode) {
      const newRange = document.createRange();
      newRange.setStartAfter(lastNode);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }

    this.editorRef.nativeElement.focus();
  }

  // Inserta texto plano en la posición del caret
  private insertTextAtCursor(text: string) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      this.editorRef.nativeElement.insertAdjacentText('beforeend', text);
      this.placeCaretAtEnd(this.editorRef.nativeElement);
      return;
    }
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);

    // Mover caret después del nodo insertado
    const newRange = document.createRange();
    newRange.setStartAfter(textNode);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
    this.editorRef.nativeElement.focus();
  }

  private placeCaretAtEnd(el: HTMLElement) {
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  // Convierte HTML del editor a texto plano (reemplaza <br> y divs por saltos de línea)
  private htmlToPlainText(html: string): string {
    let text = html.replace(/<\/div>\s*<div>/gi, '\n');
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/?[^>]+(>|$)/g, '');
    text = text.replace(/\n{3,}/g, '\n\n').trim();
    return text;
  }
}
