import { Component, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StorageService } from '../../shared/services/storage';
import { LibraryService } from '../../shared/services/library';
import { AuthService } from '../../shared/services/auth.service';
import { AiService } from '../../shared/services/ai.service';
import { TaskService } from '../../shared/services/task';

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

  generating = false;
  generateError = '';
  aiSuccessMessage = '';

  constructor(
    private storage: StorageService,
    private libraryService: LibraryService,
    private authService: AuthService,
    private aiService: AiService,
    public taskService: TaskService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngAfterViewInit() {
    const saved = this.storage.get<string>(this.storageKey, '');
    if (saved) {
      this.editorRef.nativeElement.innerText = saved;
    }
    this.updateCharCount();
    this.cdr.detectChanges();
  }

  private get storageKey(): string {
    const user = this.authService.getCurrentUser();
    return `notepad_${user?.id || user?.email || 'guest'}`;
  }

  get hasContent(): boolean {
    return !!this.editorRef?.nativeElement?.innerText?.trim();
  }

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

  onContentChange() {
    const text = this.editorRef.nativeElement.innerText || '';
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
    if (key === 'Enter') {
      e.preventDefault();
      this.insertHtmlAtCursor('<br><br>');
      this.onContentChange();
      return;
    }
    const controlKeys = [
      'Backspace',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
      'Tab',
      'Escape',
    ];
    if (controlKeys.includes(key) || e.ctrlKey || e.metaKey) {
      return;
    }
    const isPrintable = key.length === 1;
    if (isPrintable) {
      const current = this.editorRef.nativeElement.innerText || '';
      if (current.length >= this.maxChars) {
        e.preventDefault();
        return;
      }
    }
  }

  onEditorPaste(e: ClipboardEvent) {
    e.preventDefault();
    const pasteText = e.clipboardData?.getData('text') || '';
    const current = this.editorRef?.nativeElement?.innerText || '';
    const available = Math.max(0, this.maxChars - current.length);
    if (available <= 0) return;
    const toInsert = pasteText.substring(0, available);
    if (toInsert.length > 0) {
      this.insertTextAtCursor(toInsert);
      this.onContentChange();
    }
  }

  private insertHtmlAtCursor(html: string) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      this.editorRef.nativeElement.insertAdjacentHTML('beforeend', html);
      this.placeCaretAtEnd(this.editorRef.nativeElement);
      return;
    }
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

  private htmlToPlainText(html: string): string {
    let text = html.replace(/<\/div>\s*<div>/gi, '\n');
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/?[^>]+(>|$)/g, '');
    text = text.replace(/\n{3,}/g, '\n\n').trim();
    return text;
  }

  generateTasks() {
    const content = this.editorRef.nativeElement.innerText.trim();
    if (!content) return;

    this.generating = true;
    this.generateError = '';
    this.aiSuccessMessage = '';
    this.cdr.detectChanges();

    this.aiService.generateTasksFromNotes(content).subscribe({
      next: (res) => {
        console.log('1. Respuesta cruda de Cohere:', res);

        try {
          let raw = '';
          if (res?.message?.content && typeof res.message.content === 'string') {
            raw = res.message.content;
          } else if (Array.isArray(res?.message?.content) && res.message.content[0]?.text) {
            raw = res.message.content[0].text;
          }

          console.log('2. Texto extraído de la IA:', raw);

          const lines = raw.split('\n')
            .map((l: string) => l.trim())
            .filter((l: string) => l.length > 0)
            .map((l: string) => l.replace(/^[-\*\d\.]+\s*/, '').trim());

          console.log('3. Líneas de tareas procesadas:', lines);

          if (lines.length === 0) {
            this.generateError = 'No se pudieron estructurar las tareas del texto de la IA.';
          } else {
            const textoActual = this.editorRef.nativeElement.innerText;
            const nuevoBloqueTareas = `\n\n--- TAREAS SUGERIDAS ---\n` + lines.map(l => `- ${l}`).join('\n');
            
            this.editorRef.nativeElement.innerText = textoActual + nuevoBloqueTareas;
            
            this.generateError = '';
            this.aiSuccessMessage = 'Tareas sugeridas añadidas al final de la nota. Revisa y guarda el documento.';

            this.onContentChange();

            setTimeout(() => {
              this.aiSuccessMessage = '';
              this.cdr.detectChanges();
            }, 7000);
          }

        } catch (parseError) {
          console.error('Error procesando el contenido en Vercel:', parseError);
          this.generateError = 'Error de procesamiento visual al renderizar la IA.';
        } finally {
          this.generating = false;
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Error en la petición HTTP de Cohere:', err);
        if (err.status === 429) {
          this.generateError = 'Límite de la IA excedido (máx. 5 consultas por minuto). Espera un momento.';
        } else if (err.status === 401) {
          this.generateError = 'Clave de IA inválida o expirada.';
        } else {
          this.generateError = 'No se pudo conectar con la IA. Inténtalo de nuevo.';
        }
        this.generating = false;
        this.cdr.detectChanges();
      }
    });
  }
}
