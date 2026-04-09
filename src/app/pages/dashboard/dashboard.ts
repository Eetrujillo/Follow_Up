import { Component, AfterViewInit, OnDestroy, OnInit, ViewChild, ElementRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { StorageService } from '../../shared/service/storage';
import { interval, Subscription } from 'rxjs';

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
export class Dashboard implements AfterViewInit, OnDestroy, OnInit {

  @ViewChild('donutCanvas') donutCanvas!: ElementRef;
  @ViewChild('barCanvas')   barCanvas!: ElementRef;

  private donutChart!: Chart;
  private barChart!: Chart;

  newTaskText = '';
  tasks: Task[] = [];

  activities = [
    { title: 'Notas de JavaScript',  time: 'Hace 2 horas' },
    { title: 'Proyecto Final React',  time: 'Hace 5 horas' },
    { title: 'Resumen de Algoritmos', time: 'Ayer'         },
    { title: 'Guia de CSS Grid',      time: 'Hace 2 dias'  },
  ];

  segundos     = 25 * 60;   // 25 minutos
  isRunning    = false;
  private sub!: Subscription;

  constructor(private storage: StorageService, private ngZone: NgZone) {
    this.tasks = this.storage.get<Task[]>('dashboard_tasks', [
      { id: 1, text: 'Revisar notas de React Hooks',       completed: false },
      { id: 2, text: 'Completar ejercicios de TypeScript',  completed: true  },
      { id: 3, text: 'Leer capitulo 5 del libro',           completed: false },
      { id: 4, text: 'Preparar presentacion semanal',       completed: false },
    ]);
  }

  ngOnInit() {
    this.startTimer();
  }

  // Inicia el cronómetro
  startTimer() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.sub = interval(1000).subscribe(() => {
        this.ngZone.run(() => {   // <-- Forzamos que Angular detecte cambios
          if (this.segundos > 0) {
            this.segundos--;
          } else {
            this.stopTimer();
          }
        });
      });
    }
  }

  // Pausa o reanuda sin reiniciar
  toggleTimer() {
    if (this.isRunning) {
      this.sub?.unsubscribe();
      this.isRunning = false;
    } else {
      this.startTimer();
    }
  }

  // Detiene y reinicia a 25 min
  stopTimer() {
    this.sub?.unsubscribe();
    this.isRunning = false;
    this.segundos  = 25 * 60;
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  // --- Tareas ---
  get progressPercent(): number {
    if (this.tasks.length === 0) return 0;
    return Math.round((this.tasks.filter(t => t.completed).length / this.tasks.length) * 100);
  }

  saveTasks() {
    this.storage.set('dashboard_tasks', this.tasks);
  }

  addTask() {
    if (!this.newTaskText.trim()) return;
    this.tasks.push({ id: Date.now(), text: this.newTaskText.trim(), completed: false });
    this.newTaskText = '';
    this.saveTasks();
    this.updateDonut();
  }

  deleteTask(id: number) {
    this.tasks = this.tasks.filter(t => t.id !== id);
    this.saveTasks();
    this.updateDonut();
  }

  onTaskChange() {
    this.saveTasks();
    this.updateDonut();
  }

  // --- Pomodoro ---
  get statusText(): string {
    return this.isRunning ? 'En progreso' : 'En pausa';
  }

  get minutes(): string {
    return Math.floor(this.segundos / 60).toString().padStart(2, '0');
  }

  get secs(): string {
    return (this.segundos % 60).toString().padStart(2, '0');
  }

  // --- Gráficas ---
  ngAfterViewInit() {
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
          backgroundColor: ['#2a2a2a','#2a2a2a','#3b82f6','#2a2a2a','#2a2a2a','#2a2a2a','#2a2a2a'],
          borderRadius: 4,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#666', font: { size: 11 } },
            border: { display: false }
          },
          y: { display: false }
        }
      }
    });
  }
}
