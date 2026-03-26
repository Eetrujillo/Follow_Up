import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface Task {
  id: number;
  text: string;
  completed: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {

  // Referencias a los canvas de Chart.js
  @ViewChild('donutCanvas', { static: true }) donutCanvas!: ElementRef;
  @ViewChild('barCanvas',   { static: true }) barCanvas!: ElementRef;

  private donutChart!: Chart;
  private barChart!: Chart;

  // ── Tareas ──────────────────────────────────────────
  newTaskText = '';

  tasks: Task[] = [
    { id: 1, text: 'Revisar notas de React Hooks',       completed: false },
    { id: 2, text: 'Completar ejercicios de TypeScript',  completed: true  },
    { id: 3, text: 'Leer capitulo 5 del libro',           completed: false },
    { id: 4, text: 'Preparar presentacion semanal',       completed: false },
  ];

  get progressPercent(): number {
    if (this.tasks.length === 0) return 0;
    const completadas = this.tasks.filter(t => t.completed).length;
    return Math.round((completadas / this.tasks.length) * 100);
  }

  addTask() {
    if (!this.newTaskText.trim()) return;
    this.tasks.push({ id: Date.now(), text: this.newTaskText.trim(), completed: false });
    this.newTaskText = '';
    this.updateDonut();
  }

  deleteTask(id: number) {
    this.tasks = this.tasks.filter(t => t.id !== id);
    this.updateDonut();
  }

  onTaskChange() {
    this.updateDonut();
  }

  // ── Actividad reciente ───────────────────────────────
  activities = [
    { title: 'Notas de JavaScript',  time: 'Hace 2 horas' },
    { title: 'Proyecto Final React',  time: 'Hace 5 horas' },
    { title: 'Resumen de Algoritmos', time: 'Ayer'         },
    { title: 'Guia de CSS Grid',      time: 'Hace 2 dias'  },
  ];

  // ── Pomodoro ─────────────────────────────────────────
  segundos = 25 * 60;
  isRunning = false;
  private intervalo: any;

  get statusText(): string {
    return this.isRunning ? 'En progreso' : 'En pausa';
  }

  formatTime(): string {
    const m = Math.floor(this.segundos / 60).toString().padStart(2, '0');
    const s = (this.segundos % 60).toString().padStart(2, '0');
    return `${m} : ${s}`;
  }

  toggleTimer() {
    if (this.isRunning) {
      clearInterval(this.intervalo);
      this.isRunning = false;
    } else {
      this.isRunning = true;
      this.intervalo = setInterval(() => {
        if (this.segundos > 0) {
          this.segundos--;
        } else {
          this.stopTimer();
        }
      }, 1000);
    }
  }

  stopTimer() {
    clearInterval(this.intervalo);
    this.isRunning = false;
    this.segundos = 25 * 60;
  }

  // ── Charts ───────────────────────────────────────────
  ngOnInit() {
    this.createDonut();
    this.createBar();
  }

  createDonut() {
    const pct = this.progressPercent;
    this.donutChart = new Chart(this.donutCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [pct, 100 - pct],
          backgroundColor: ['#3b82f6', '#2a2a2a'],
          borderWidth: 0,
          borderRadius: 4,
        }]
      },
      options: {
        cutout: '78%',
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        animation: { duration: 500 }
      }
    });
  }

  updateDonut() {
    const pct = this.progressPercent;
    this.donutChart.data.datasets[0].data = [pct, 100 - pct];
    this.donutChart.update();
  }

  createBar() {
    this.barChart = new Chart(this.barCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'],
        datasets: [{
          data: [3, 5, 8, 2, 1, 0, 0],
          backgroundColor: (ctx) => {
            // El dia de hoy (indice 2 = Miercoles) en azul
            return ctx.dataIndex === 2 ? '#3b82f6' : '#2a2a2a';
          },
          borderRadius: 4,
          borderSkipped: false,
        }]
      },
      options: {
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#666', font: { size: 11 } },
            border: { display: false }
          },
          y: {
            display: false,
            grid: { display: false }
          }
        },
        animation: { duration: 500 }
      }
    });
  }
}