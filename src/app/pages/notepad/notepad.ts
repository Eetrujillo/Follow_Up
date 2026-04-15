import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-notepad',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notepad.html',
  styleUrl: './notepad.css'
})
export class Notepad implements OnInit, OnDestroy {

  content = '';

  bold      = false;
  italic    = false;
  underline = false;

<<<<<<< HEAD
  remainingTime = 60;
=======
  remainingTime = 60; 
>>>>>>> e2099b9 (tareas)
  private intervalId: any;

  applyBold()      { this.bold      = !this.bold;      }
  applyItalic()    { this.italic    = !this.italic;    }
  applyUnderline() { this.underline = !this.underline; }

  ngOnInit() {
    this.intervalId = setInterval(() => {
      if (this.remainingTime > 0) {
        this.remainingTime--;
      }
    }, 1000);
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}