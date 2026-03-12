import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Task {
  id: number;
  text: string;
  completed: boolean;
}

interface Activity {
  title: string;
  time: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule], // Soluciona el error NG8002 de ngModel
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit, OnDestroy {

  tasks: Task[] = [
    { id: 1, text: "Revisar notas de React Hooks", completed: true },
    { id: 2, text: "Completar ejercicios de TypeScript", completed: true },
    { id: 3, text: "Leer capítulo 5 del libro", completed: false },
    { id: 4, text: "Preparar presentación semanal", completed: false }
  ];

  newTaskText: string = '';

  activities: Activity[] = [
    { title: 'Notas de JavaScript', time: 'Hace 2 horas' },
    { title: 'Proyecto Final React', time: 'Hace 5 horas' },
    { title: 'Resumen de Algoritmos', time: 'Ayer' },
    { title: 'Guía de CSS Grid', time: 'Hace 2 días' }
  ];

  seconds: number = 1490;
  timerInterval: any;
  isRunning: boolean = false;
  statusText: string = 'Sesión Activa';

  ngOnInit() {}

  get progressPercent(): number {
    if (this.tasks.length === 0) return 0;
    const completed = this.tasks.filter(t => t.completed).length;
    return Math.round((completed / this.tasks.length) * 100);
  }

  addTask() {
    if (this.newTaskText.trim()) {
      this.tasks.push({
        id: Date.now(),
        text: this.newTaskText,
        completed: false
      });
      this.newTaskText = '';
    }
  }

  toggleTimer() {
    if (this.isRunning) {
      clearInterval(this.timerInterval);
      this.statusText = 'Sesión Pausada';
    } else {
      this.statusText = 'Sesión Activa';
      this.timerInterval = setInterval(() => {
        this.seconds--;
        if (this.seconds <= 0) this.stopTimer();
      }, 1000);
    }
    this.isRunning = !this.isRunning;
  }

  stopTimer() {
    clearInterval(this.timerInterval);
    this.isRunning = false;
    this.statusText = 'Sesión Finalizada';
  }

  formatTime(): string {
    const m = Math.floor(this.seconds / 60).toString().padStart(2, '0');
    const s = (this.seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }
}