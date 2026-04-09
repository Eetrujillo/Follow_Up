import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-notepad',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notepad.html',
  styleUrl: './notepad.css'
})
export class Notepad {


  bold      = false;
  italic    = false;
  underline = false;

  applyBold()      { this.bold      = !this.bold;      }
  applyItalic()    { this.italic    = !this.italic;    }
  applyUnderline() { this.underline = !this.underline; }
}