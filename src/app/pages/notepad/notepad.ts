import {
  Component,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LibraryService } from '../../shared/services/library';
import { NotepadApiService } from '../../shared/services/notepad-api.service';
import { AiService } from '../../shared/services/ai.service';
import { TaskService } from '../../shared/services/task';

const SAVE_DEBOUNCE_MS = 800;

/**
 * The draft lives in PostgreSQL through `/notepad`. Everything written from an
 * HTTP callback is a signal, because the application runs zoneless.
 */
@Component({
  selector: 'app-notepad',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notepad.html',
  styleUrl: './notepad.css',
})
export class Notepad implements AfterViewInit, OnDestroy {
  @ViewChild('editor', { static: true }) editorRef!: ElementRef<HTMLElement>;

  readonly saved = signal(false);
  readonly errorMessage = signal('');
  showSaveModal = false;
  noteName = '';

  maxChars = 3000;
  readonly charCount = signal(0);
  readonly isOverLimit = signal(false);
  readonly hasContent = signal(false);

  readonly generating = signal(false);
  readonly generateError = signal('');
  readonly aiSuccessMessage = signal('');

  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private notepadApi: NotepadApiService,
    private libraryService: LibraryService,
    private aiService: AiService,
    public taskService: TaskService,
  ) {}

  ngAfterViewInit() {
    this.notepadApi.get().subscribe({
      next: (draft) => {
        if (draft.contentHtml) {
          this.editorRef.nativeElement.innerHTML = draft.contentHtml;
        }
        this.updateCharCount();
      },
      error: () => this.errorMessage.set('No se pudo cargar la nota guardada.'),
    });
  }

  ngOnDestroy() {
    this.flushDraft();
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
    const text = this.plainText();
    if (text.length > this.maxChars) {
      const truncated = text.substring(0, this.maxChars);
      this.editorRef.nativeElement.textContent = truncated;
      this.placeCaretAtEnd(this.editorRef.nativeElement);
    }

    this.updateCharCount();
    this.saved.set(false);
    this.scheduleSave();
  }

  openSaveModal() {
    this.noteName = '';
    this.showSaveModal = true;
  }

  saveToLibrary() {
    const name = this.noteName.trim();
    if (!name) return;

    this.errorMessage.set('');
    this.libraryService.saveNote(name, this.plainText()).subscribe({
      next: () => {
        this.showSaveModal = false;
        this.saved.set(true);
        setTimeout(() => this.saved.set(false), 2000);
      },
      error: () => this.errorMessage.set('No se pudo guardar la nota en la biblioteca.'),
    });
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
      const current = this.plainText();
      if (current.length >= this.maxChars) {
        e.preventDefault();
        return;
      }
    }
  }

  onEditorPaste(e: ClipboardEvent) {
    e.preventDefault();
    const pasteText = e.clipboardData?.getData('text') || '';
    const current = this.plainText();
    const available = Math.max(0, this.maxChars - current.length);
    if (available <= 0) return;
    const toInsert = pasteText.substring(0, available);
    if (toInsert.length > 0) {
      this.insertTextAtCursor(toInsert);
      this.onContentChange();
    }
  }

  generateTasks() {
    const content = this.plainText().trim();
    if (!content) return;

    this.generating.set(true);
    this.generateError.set('');
    this.aiSuccessMessage.set('');

    this.aiService.generateTasksFromNotes(content).subscribe({
      next: (res) => {
        try {
          const raw = this.aiText(res);
          const lines = raw
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .map((line) => line.replace(/^[-*\d.]+\s*/, '').trim());

          if (lines.length === 0) {
            this.generateError.set('No se pudieron estructurar las tareas del texto de la IA.');
          } else {
            const textoActual = this.plainText();
            const nuevoBloqueTareas = `\n\n--- TAREAS SUGERIDAS ---\n` + lines.map((l) => `- ${l}`).join('\n');

            this.editorRef.nativeElement.textContent = textoActual + nuevoBloqueTareas;
            this.aiSuccessMessage.set('Tareas sugeridas añadidas al final de la nota. Revisa y guarda el documento.');
            this.onContentChange();

            setTimeout(() => this.aiSuccessMessage.set(false as unknown as string), 7000);
          }
        } catch {
          this.generateError.set('Error de procesamiento visual al renderizar la IA.');
        } finally {
          this.generating.set(false);
        }
      },
      error: (err) => {
        if (err?.status === 429) {
          this.generateError.set('Límite de la IA excedido (máx. 5 consultas por minuto). Espera un momento.');
        } else if (err?.status === 401) {
          this.generateError.set('Clave de IA inválida o expirada.');
        } else {
          this.generateError.set('No se pudo conectar con la IA. Inténtalo de nuevo.');
        }
        this.generating.set(false);
      },
    });
  }

  private aiText(res: unknown): string {
    const message = (res as { message?: { content?: unknown } } | null)?.message;
    if (typeof message?.content === 'string') {
      return message.content;
    }
    const parts = message?.content as { text?: string }[] | undefined;
    if (Array.isArray(parts) && parts[0]?.text) {
      return parts[0].text;
    }
    return '';
  }

  /**
   * The editor's plain text. `innerText` is what a browser renders; jsdom does not
   * implement it, so `textContent` is the fallback used by the tests.
   */
  private plainText(): string {
    const editor = this.editorRef.nativeElement;
    return editor.innerText ?? editor.textContent ?? '';
  }

  private updateCharCount() {
    const text = this.plainText();
    this.charCount.set(text.length);
    this.isOverLimit.set(text.length > this.maxChars);
    this.hasContent.set(text.trim().length > 0);

    if (this.isOverLimit()) {
      this.editorRef.nativeElement.classList.add('over-limit');
    } else {
      this.editorRef.nativeElement.classList.remove('over-limit');
    }
  }

  /** Debounced upsert of the draft: one request per burst of typing. */
  private scheduleSave() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    this.saveTimer = setTimeout(() => this.flushDraft(), SAVE_DEBOUNCE_MS);
  }

  private flushDraft() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    this.notepadApi.save(this.editorRef.nativeElement.innerHTML).subscribe({
      error: () => this.errorMessage.set('No se pudo guardar la nota en el servidor.'),
    });
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
}
