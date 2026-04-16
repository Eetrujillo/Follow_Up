import { Component, AfterViewInit, ViewChild, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { TaskService } from '../../shared/services/task';
import { LibraryService } from '../../shared/services/library';
import { StorageService } from '../../shared/services/storage';
import { AuthService } from '../../shared/services/auth.service';

Chart.register(...registerables);

@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './statistics.html',
  styleUrl: './statistics.css'
})
export class Statistics implements OnInit, AfterViewInit {

  @ViewChild('weeklyCanvas') weeklyCanvas!: ElementRef;

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
    this.createWeeklyChart();
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

    new Chart(this.weeklyCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: days,
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