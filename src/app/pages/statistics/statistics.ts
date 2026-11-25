import {
  Component,
  AfterViewInit,
  ViewChild,
  ViewChildren,
  QueryList,
  ElementRef,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { TaskService } from '../../shared/services/task';
import { LibraryService } from '../../shared/services/library';
import { StorageService } from '../../shared/services/storage';
import { AuthService } from '../../shared/services/auth.service';
import { countUp, duration, prefersReducedMotion } from '../../shared/motion/motion';

Chart.register(...registerables);

@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './statistics.html',
  styleUrl: './statistics.css'
})
export class Statistics implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('weeklyCanvas') weeklyCanvas!: ElementRef;

  // Cifras que hacen count-up. `data-count` guarda el valor real: el texto que
  // escribe la animación termina exactamente en ese número.
  @ViewChildren('countTarget') countTargets!: QueryList<ElementRef<HTMLElement>>;

  private countObserver?: IntersectionObserver;
  private countStops: Array<() => void> = [];

  totalTasks       = 0;
  completedTasks   = 0;
  totalDocs        = 0;
  objectivePercent = 0;
  studyStreak      = 0;

  weekly = [
    { label: 'Tareas completadas', percent: 0 },
    { label: 'Documentos creados', percent: 0 },
    { label: 'Notas guardadas',    percent: 0 },
    { label: 'Objetivos',          percent: 0 },
  ];

  /** Estado vacío: sin tareas y sin documentos no hay nada que graficar. */
  get hasData(): boolean {
    return this.totalTasks > 0 || this.totalDocs > 0;
  }

  private get streakKey(): string {
    const user = this.authService.getCurrentUser();
    return `streak_${user?.id || user?.email || 'guest'}`;
  }

  constructor(
    private taskService:    TaskService,
    private libraryService: LibraryService,
    private storage:        StorageService,
    private authService:    AuthService
  ) {}

  ngOnInit() {
    this.calculateStats();
  }

  calculateStats() {
    const tasks      = this.taskService.getTasks();
    this.totalTasks  = tasks.length;
    this.completedTasks = tasks.filter(t => t.completed).length;

    const taskPercent = this.totalTasks > 0
      ? Math.round((this.completedTasks / this.totalTasks) * 100)
      : 0;

    const folders    = this.libraryService.getFolders();
    const allDocs    = folders.flatMap(f => f.documents);
    this.totalDocs   = allDocs.length;

    const totalNotes = folders
      .filter(f => f.isNotesFolder)
      .flatMap(f => f.documents).length;

    const docPercent  = Math.min(this.totalDocs * 5, 100);
    const notePercent = Math.min(totalNotes * 10, 100);

    this.objectivePercent = Math.round((taskPercent + docPercent) / 2);

    this.updateStreak();
    this.studyStreak = this.storage.get<number>(this.streakKey, 0);

    this.weekly = [
      { label: 'Tareas completadas', percent: taskPercent   },
      { label: 'Documentos creados', percent: docPercent    },
      { label: 'Notas guardadas',    percent: notePercent   },
      { label: 'Objetivos',          percent: this.objectivePercent },
    ];
  }

  updateStreak() {
    const lastKey  = `last_visit_${this.authService.getCurrentUser()?.email}`;
    const today    = new Date().toDateString();
    const lastVisit = this.storage.get<string>(lastKey, '');

    if (lastVisit === today) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (lastVisit === yesterday.toDateString()) {
      const current = this.storage.get<number>(this.streakKey, 0);
      this.storage.set(this.streakKey, current + 1);
    } else if (lastVisit !== today) {
      this.storage.set(this.streakKey, 1);
    }

    this.storage.set(lastKey, today);
  }

  ngAfterViewInit() {
    if (this.hasData) {
      this.createWeeklyChart();
    }
    this.queueCountUps();
  }

  ngOnDestroy() {
    this.countObserver?.disconnect();
    this.countStops.forEach(stop => stop());
    this.countStops = [];
  }

  /**
   * Las cifras ya están en el DOM con su valor real (visible por defecto).
   * El conteo arranca sólo cuando el bloque entra en vista, y con movimiento
   * reducido no hay conteo: `countUp` escribe el valor final de una vez.
   */
  private queueCountUps(): void {
    const targets = (this.countTargets?.map(ref => ref.nativeElement) ?? []);
    if (!targets.length) return;

    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      targets.forEach(el => this.runCountUp(el));
      return;
    }

    this.countObserver = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          this.countObserver?.unobserve(entry.target);
          this.runCountUp(entry.target as HTMLElement);
        }
      },
      { threshold: 0.12 },
    );

    targets.forEach(el => this.countObserver!.observe(el));
  }

  private runCountUp(el: HTMLElement): void {
    const to = Number(el.dataset['count'] ?? 0);
    this.countStops.push(countUp(el, to, 900));
  }

  /** Lee un token CSS de :root para que la paleta de Chart.js siga al tema. */
  private tokenColor(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  createWeeklyChart() {
    const tasks   = this.taskService.getTasks();
    const folders = this.libraryService.getFolders();

    const days = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
    const data = [0, 0, 0, 0, 0, 0, 0];

    tasks.forEach(t => {
      const d = new Date(t.id);
      const idx = (d.getDay() + 6) % 7;
      data[idx]++;
    });

    folders.flatMap(f => f.documents).forEach(doc => {
      const d = new Date(doc.id);
      const idx = (d.getDay() + 6) % 7;
      data[idx]++;
    });

    const colors = Array(7).fill(this.tokenColor('--data'));
    colors[(new Date().getDay() + 6) % 7] = this.tokenColor('--accent');

    new Chart(this.weeklyCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: days,
        datasets: [{
          data,
          backgroundColor: colors,
          borderRadius: 4,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: duration(700) },
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: this.tokenColor('--t3'), font: { size: 11 } },
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