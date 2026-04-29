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
  styleUrl: './notepad.css'
})
export class Notepad implements AfterViewInit {
  @ViewChild('editor') editorRef!: ElementRef<HTMLElement>;

  saved = false;
  showSaveModal = false;
  noteName = '';

  private storageKey: string;

  constructor(
    private storage: StorageService,
    private libraryService: LibraryService,
    private authService: AuthService
  ) {
    const user = this.authService.getCurrentUser();
    this.storageKey = `notepad_${user?.id || user?.email || 'guest'}`;
  }

  ngAfterViewInit() {
    const saved = this.storage.get<string>(this.storageKey, '');
    if (saved) {
      this.editorRef.nativeElement.innerHTML = saved;
    }
  }

  applyFormat(command: 'bold' | 'italic' | 'underline') {
    document.execCommand(command, false);
    this.focusEditor();
    this.saveLocal();
  }

  isActive(command: 'bold' | 'italic' | 'underline'): boolean {
    return document.queryCommandState(command);
  }

  saveLocal() {
    const content = this.editorRef?.nativeElement?.innerHTML ?? '';
    this.storage.set(this.storageKey, content);
    this.saved = false;
  }

  onContentChange() {
    this.saveLocal();
  }

  openSaveModal() {
    this.noteName = '';
    this.showSaveModal = true;
  }

  saveToLibrary() {
    const name = this.noteName?.trim();
    if (!name) return;
    const content = this.editorRef?.nativeElement?.innerHTML ?? '';
    if (!content.trim()) return;

    this.libraryService.saveNote(name, content);
    this.showSaveModal = false;
    this.saved = true;
    setTimeout(() => (this.saved = false), 2000);
  }

  private focusEditor() {
    this.editorRef?.nativeElement?.focus();
  }

  get hasContent(): boolean {
    return !!(this.editorRef?.nativeElement?.innerText?.trim());
  }
}
