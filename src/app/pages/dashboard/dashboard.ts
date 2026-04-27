import { Component, AfterViewInit, ViewChild, ElementRef, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { TaskService, Task } from '../../shared/services/task';
import { Subscription, interval } from 'rxjs';
import { takeWhile } from 'rxjs/operators';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard', 
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',  
  styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('donutCanvas') donutCanvas!: ElementRef;
  @ViewChild('barCanvas')   barCanvas!: ElementRef;

  private donutChart!: Chart;
  private barChart!: Chart;
  private taskSub!: Subscription;

  newTaskText = '';
  tasks: Task[] = [];

  activities = [
    { title: 'Notas de JavaScript',  time: 'Hace 2 horas' },
    { title: 'Proyecto Final React',  time: 'Hace 5 horas' },
    { title: 'Resumen de Algoritmos', time: 'Ayer'         },
    { title: 'Guia de CSS Grid',      time: 'Hace 2 dias'  },
  ];

  segundos = 25 * 60; 
  isRunning = false;
  private timerSub: Subscription | null = null;

  minutes: string = '25';
  secs: string = '00';

  constructor(private taskService: TaskService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.taskSub = this.taskService.tasks$.subscribe(tasks => {
      this.tasks = tasks;
      if (this.donutChart) this.updateDonut();
    });
  }

  get progressPercent(): number {
    if (this.tasks.length === 0) return 0;
    return Math.round((this.tasks.filter(t => t.completed).length / this.tasks.length) * 100);
  }

  addTask() {
    if (!this.newTaskText.trim()) return;
    this.taskService.addTask(this.newTaskText.trim(), 'dashboard');
    this.newTaskText = '';
  }

  deleteTask(id: number) {
    this.taskService.deleteTask(id);
  }

  onTaskChange(task: Task) {
    this.taskService.toggleTask(task.id);
  }

  // --- TIMER GETTERS ---
  get statusText(): string { return this.isRunning ? 'En progreso' : 'En pausa'; }

  // --- TIMER LOGIC ---
  toggleTimer() {
    if (this.isRunning) {
      this.pauseTimer();
    } else {
      this.startTimer();
    }
  }

  private startTimer() {
    if (this.isRunning) return;
    this.isRunning = true;

    this.timerSub = interval(1000)
      .pipe(takeWhile(() => this.segundos > 0))
      .subscribe({
        next: () => {
          this.segundos--; 
          this.updateTime(); 
        },
        complete: () => {
          this.stopTimer();
        }
      });
  }

  private pauseTimer() {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.timerSub?.unsubscribe();
    this.timerSub = null;
  }

  stopTimer() {
    this.timerSub?.unsubscribe();
    this.timerSub = null;
    this.isRunning = false;
    this.segundos = 25 * 60; 
    this.updateTime(); 
  }

  private updateTime() {
    const minutesLeft = Math.floor(this.segundos / 60);
    const secondsLeft = this.segundos % 60;

    this.minutes = minutesLeft < 10 ? `0${minutesLeft}` : `${minutesLeft}`;
    this.secs = secondsLeft < 10 ? `0${secondsLeft}` : `${secondsLeft}`;

    this.cdr.detectChanges();
  }

  ngOnDestroy() {
    this.timerSub?.unsubscribe();
    this.taskSub?.unsubscribe();
  }

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
  const todayIndex = (new Date().getDay() + 6) % 7;

  const colors = ['#2a2a2a','#2a2a2a','#2a2a2a','#2a2a2a','#2a2a2a','#2a2a2a','#2a2a2a'];
  colors[todayIndex] = '#3b82f6'; 

  this.barChart = new Chart(this.barCanvas.nativeElement, {
    type: 'bar',
    data: {
      labels: ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'],
      datasets: [{
        data: [3, 5, 8, 2, 1, 0, 0],
        backgroundColor: colors,
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