import { Component, AfterViewInit, ViewChild, ElementRef, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { TaskService, Task } from '../../shared/services/task';
import { TimerService } from '../../shared/services/timer.service';
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
    { title: 'Proyecto Final React', time: 'Hace 5 horas' },
    { title: 'Resumen de Algoritmos', time: 'Ayer' },
    { title: 'Guia de CSS Grid',     time: 'Hace 2 dias' },
    { title: 'Resumen de Algoritmos', time: 'Ayer' },
    { title: 'Guia de CSS Grid',     time: 'Hace 2 dias' },
  ];

  segundos = 25 * 60;
  isRunning = false;
  private timerSub: Subscription | null = null;

  minutes: string = '25';
  secs: string = '00';

  constructor(
    private taskService: TaskService,
    private cdr: ChangeDetectorRef,
    private timer: TimerService,
  ) {}

  ngOnInit() {
    // S7: resume the Pomodoro through TimerService — per-account state with an
    // epoch anchor, so navigation never erases it and a running countdown
    // discounts the time spent away before it continues ticking.
    const state = this.timer.restore();
    this.segundos = state.segundos;
    this.isRunning = state.isRunning;
    this.updateTime();
    if (this.isRunning) this.startTimer();

    this.taskSub = this.taskService.tasks$.subscribe(tasks => {
      this.tasks = tasks;
      if (this.donutChart) this.updateDonut();
    });
  }

  private savePomodoroState() {
    this.timer.save({ segundos: this.segundos, isRunning: this.isRunning, startedAt: this.isRunning ? Date.now() : null });
  }

  get progressPercent(): number {
    if (this.tasks.length === 0) return 0;
    return Math.round((this.tasks.filter(t => t.completed).length / this.tasks.length) * 100);
  }

  addTask() {
    if (!this.newTaskText.trim()) return;
    this.taskService.addTask(this.newTaskText.trim());
    this.newTaskText = '';
  }

  deleteTask(id: string) {
    this.taskService.deleteTask(id);
  }

  onTaskChange(task: Task) {
    this.taskService.toggleTask(task.id);
  }

  get statusText(): string { return this.isRunning ? 'En progreso' : 'En pausa'; }

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
    this.savePomodoroState();

    this.timerSub = interval(1000)
      .pipe(takeWhile(() => this.segundos > 0))
      .subscribe({
        next: () => {
          this.segundos--;
          this.updateTime();
          this.savePomodoroState();
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
    this.savePomodoroState();
  }

  stopTimer() {
    this.timerSub?.unsubscribe();
    this.timerSub = null;
    this.isRunning = false;
    this.segundos = 25 * 60;
    this.updateTime();
    this.savePomodoroState();
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
    // S7: leaving the page does not erase nor pause the countdown — the saved
    // epoch anchor lets the next visit resume it with the real elapsed time.
    this.savePomodoroState();
  }

  ngAfterViewInit() {
    this.createDonut();
    this.createBar();
  }

  /** Lee un token CSS de :root para que la paleta de Chart.js siga al tema. */
  private tokenColor(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  createDonut() {
    const pct = this.progressPercent;
    this.donutChart = new Chart(this.donutCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [pct, 100 - pct],
          backgroundColor: [this.tokenColor('--accent'), this.tokenColor('--hairline-2')],
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

    const colors = Array(7).fill(this.tokenColor('--data'));
    colors[todayIndex] = this.tokenColor('--accent');

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
            ticks: { color: this.tokenColor('--t3'), font: { size: 11 } },
            border: { display: false }
          },
          y: { display: false }
        }
      }
    });
  }
}
