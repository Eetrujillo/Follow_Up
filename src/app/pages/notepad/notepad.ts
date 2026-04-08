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

  content = 'Este es tu bloc de notas personal. Puedes usarlo para ideas rapidas, notas de estudio, o cualquier cosa que necesites recordar';

  bold      = false;
  italic    = false;
  underline = false;

  applyBold()      { this.bold      = !this.bold;      }
  applyItalic()    { this.italic    = !this.italic;    }
  applyUnderline() { this.underline = !this.underline; }
}