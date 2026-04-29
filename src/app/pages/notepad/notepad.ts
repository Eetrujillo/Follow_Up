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

  @ViewChild('editor') editorRef!: ElementRef;

  saved         = false;
  showSaveModal = false;
  noteName      = '';

  private get storageKey(): string {
    const user = this.authService.getCurrentUser();
    return `notepad_${user?.id || user?.email || 'guest'}`;
  }

  get hasContent(): boolean {
    return !!this.editorRef?.nativeElement?.innerText?.trim();
  }

  constructor(
    private storage:        StorageService,
    private libraryService: LibraryService,
    private authService:    AuthService
  ) {}

  ngAfterViewInit() {
    // Cargar contenido guardado
    const saved = this.storage.get<string>(this.storageKey, '');
    if (saved) {
      this.editorRef.nativeElement.innerHTML = saved;
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

  onContentChange() {
    const content = this.editorRef.nativeElement.innerHTML;
    this.storage.set(this.storageKey, content);
    this.saved = false;
  }

  openSaveModal() {
    this.noteName = '';
    this.showSaveModal = true;
  }

  saveToLibrary() {
    if (!this.noteName.trim()) return;
    const content = this.editorRef.nativeElement.innerHTML;
    this.libraryService.saveNote(this.noteName.trim(), content);
    this.showSaveModal = false;
    this.saved = true;
    setTimeout(() => this.saved = false, 2000);
  }
}