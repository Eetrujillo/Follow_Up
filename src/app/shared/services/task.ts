import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { StorageService } from './storage';
import { AuthService } from './auth.service';

export interface Task {
  id: number;
  text: string;
  completed: boolean;
  source: 'dashboard' | 'calendar';
  date?: string;
}

@Injectable({ providedIn: 'root' })
export class TaskService {
  private tasksSubject = new BehaviorSubject<Task[]>([]);
  tasks$ = this.tasksSubject.asObservable();

  constructor(
    private storage: StorageService,
    private authService: AuthService,
  ) {
    this.loadTasks();
  }

  private StorageKey(): string {
    const user = this.authService.getCurrentUser();
    return `tasks_user_${user?.id || user?.email || 'guest'}`;
  }

  private loadTasks() {
    const saved = this.storage.get<Task[]>(this.StorageKey(), [
      { id: 1, text: 'Tarea de ejemplo', completed: false, source: 'dashboard' },
      {
        id: 2,
        text: 'Evento de ejemplo',
        completed: false,
        source: 'calendar',
        date: new Date().toISOString().split('T')[0],
      },
      { id: 3, text: 'Tarea completada', completed: true, source: 'dashboard' },
    ]);
    this.tasksSubject.next(saved);
  }
  reloadForUser() {
    this.loadTasks();
  }

  getTasks(): Task[] {
    return this.tasksSubject.getValue();
  }

  addTask(text: string, source: 'dashboard' | 'calendar', date?: string) {
    const tasks = this.getTasks();
    tasks.push({ id: Date.now(), text, completed: false, source, date });
    this.save(tasks);
  }

  toggleTask(id: number) {
    const tasks = this.getTasks().map(t => (t.id === id ? { ...t, completed: !t.completed } : t));
    this.save(tasks);
  }

  deleteTask(id: number) {
    const tasks = this.getTasks().filter(t => t.id !== id);
    this.save(tasks);
  }

  private save(tasks: Task[]) {
    this.tasksSubject.next(tasks);
    this.storage.set(this.StorageKey(), tasks);
  }
}
