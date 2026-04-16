import { Component } from '@angular/core';
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
export class Notepad {

  content   = '';
  bold      = false;
  italic    = false;
  underline = false;
  saved     = false;

  
  showSaveModal = false;
  noteName      = '';

  private get storageKey(): string {
    const user = this.authService.getCurrentUser();
    return `notepad_${user?.id || user?.email || 'guest'}`;
  }

  constructor(
    private storage:        StorageService,
    private libraryService: LibraryService,
    private authService:    AuthService
  ) {
    this.content = this.storage.get<string>(this.storageKey, '');
  }

  applyBold()      { this.bold      = !this.bold;      }
  applyItalic()    { this.italic    = !this.italic;    }
  applyUnderline() { this.underline = !this.underline; }

  onContentChange() {
    this.storage.set(this.storageKey, this.content);
    this.saved = false;
  }

  openSaveModal() {
    this.noteName = '';
    this.showSaveModal = true;
  }

  saveToLibrary() {
    if (!this.noteName.trim() || !this.content.trim()) return;
    this.libraryService.saveNote(this.noteName.trim(), this.content);
    this.showSaveModal = false;
    this.saved = true;

    setTimeout(() => this.saved = false, 2000);
  }
}