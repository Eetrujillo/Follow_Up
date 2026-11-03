import { Component, AfterViewInit, ViewChild, ElementRef, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { forkJoin } from 'rxjs';
import { TasksApiService, BackendTask } from '../../shared/services/tasks-api.service';
import { DocumentsApiService } from '../../shared/services/documents-api.service';
import { StatsApiService } from '../../shared/services/stats-api.service';
import { switchMap } from 'rxjs/operators';

Chart.register(...registerables);

const DAY_LABELS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

/** Index of the week with Monday as 0, matching the chart labels. */
function weekdayIndex(isoDate: string): number {
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime()) ? -1 : (date.getDay() + 6) % 7;
}

/**
 * Every counter comes from the API (streak) or is aggregated from the API data
 * (tasks and documents). Signals, because the application runs zoneless.
 */
@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './statistics.html',
  styleUrl: './statistics.css'
})
export class Statistics implements OnInit, AfterViewInit {

  @ViewChild('weeklyCanvas') weeklyCanvas?: ElementRef<HTMLCanvasElement>;

  readonly totalTasks       = signal(0);
  readonly completedTasks   = signal(0);
  readonly totalDocs        = signal(0);
  readonly objectivePercent = signal(0);
  readonly studyStreak      = signal(0);
  readonly errorMessage     = signal('');

  readonly weekly = signal([
    { label: 'Tareas completadas', percent: 0 },
    { label: 'Documentos creados', percent: 0 },
    { label: 'Notas guardadas',    percent: 0 },
    { label: 'Objetivos',          percent: 0 },
  ]);

  private tasks: BackendTask[] = [];
  private documentDates: string[] = [];
  private chart: Chart | null = null;

  constructor(
    private tasksApi:    TasksApiService,
    private documentsApi: DocumentsApiService,
    private statsApi:    StatsApiService,
  ) {}

  ngOnInit() {
    this.loadStreak();
    this.loadTotals();
  }

  ngAfterViewInit() {
    this.renderChart();
  }

  private loadStreak() {
    this.statsApi
      .registerVisit()
      .pipe(switchMap(() => this.statsApi.getStreak()))
      .subscribe({
        next: (streak) => this.studyStreak.set(streak.currentStreakDays),
        error: () => this.errorMessage.set('No se pudo cargar la racha de estudio.'),
      });
  }

  private loadTotals() {
    forkJoin({
      tasks: this.tasksApi.getAll(),
      documents: this.documentsApi.getAll(),
    }).subscribe({
      next: ({ tasks, documents }) => {
        this.tasks = [...tasks].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        this.documentDates = documents.map((document) => document.createdAt);

        const total = this.tasks.length;
        const completed = this.tasks.filter((task) => task.isCompleted).length;
        const taskPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

        const docs = documents.length;
        const notes = documents.filter((document) => document.fromNotepad).length;
        const docPercent = Math.min(docs * 5, 100);
        const notePercent = Math.min(notes * 10, 100);
        const objectivePercent = Math.round((taskPercent + docPercent) / 2);

        this.totalTasks.set(total);
        this.completedTasks.set(completed);
        this.totalDocs.set(docs);
        this.objectivePercent.set(objectivePercent);
        this.weekly.set([
          { label: 'Tareas completadas', percent: taskPercent },
          { label: 'Documentos creados', percent: docPercent },
          { label: 'Notas guardadas',    percent: notePercent },
          { label: 'Objetivos',          percent: objectivePercent },
        ]);

        this.renderChart();
      },
      error: () => this.errorMessage.set('No se pudieron cargar tus estadisticas.'),
    });
  }

  /** Bars per weekday built from the real `createdAt` values (backend ids are UUIDs). */
  private renderChart() {
    const canvas = this.weeklyCanvas?.nativeElement;
    if (!canvas || typeof canvas.getContext !== 'function' || !canvas.getContext('2d')) {
      return;
    }

    const data = [0, 0, 0, 0, 0, 0, 0];
    this.tasks.forEach((task) => {
      const index = weekdayIndex(task.createdAt);
      if (index >= 0) data[index] += 1;
    });
    this.documentDates.forEach((createdAt) => {
      const index = weekdayIndex(createdAt);
      if (index >= 0) data[index] += 1;
    });

    if (this.chart) {
      this.chart.data.datasets[0].data = data;
      this.chart.update();
      return;
    }

    this.chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: DAY_LABELS,
        datasets: [{
          data,
          backgroundColor: '#3b82f6',
          borderRadius: 4,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#666', font: { size: 11 } },
            border: { display: false }
          },
          y: {
            display: false,
            beginAtZero: true
          }
        }
      }
    });
  }
}
