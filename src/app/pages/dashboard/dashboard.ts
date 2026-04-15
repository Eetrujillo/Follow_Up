import { Component, AfterViewInit, OnDestroy, OnInit, ViewChild, ElementRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
<<<<<<< HEAD
import { TaskService, Task } from '../../shared/services/task';
import { Subscription, interval } from 'rxjs';
=======
import { StorageService } from '../../shared/services/storage';
import { TaskService, Task } from '../../shared/services/task';
import { interval, Subscription } from 'rxjs';
>>>>>>> be87f23 (tareas)

Chart.register(...registerables);

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
  private taskSub!: Subscription;

  constructor(private storage: StorageService, private ngZone: NgZone, private taskService: TaskService) {
  }

  ngOnInit() {
    this.startTimer();
    this.taskSub = this.taskService.tasks$.subscribe((tasks: Task[]) => {
      this.tasks = tasks.filter(t => t.source === 'dashboard');
    });
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
    this.taskSub?.unsubscribe();
  }

  // --- Tareas ---
  get progressPercent(): number {
    if (this.tasks.length === 0) return 0;
    return Math.round((this.tasks.filter(t => t.completed).length / this.tasks.length) * 100);
  }

  addTask() {
    if (!this.newTaskText.trim()) return;
    this.taskService.addTask(this.newTaskText.trim(), 'dashboard');
    this.newTaskText = '';
    this.updateDonut();
  }

  deleteTask(id: number) {
    this.taskService.deleteTask(id);
    this.updateDonut();
  }

  onTaskChange(id: number) {
    this.taskService.toggleTask(id);
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
