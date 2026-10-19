import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
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
  private readonly storage = inject(StorageService);
  private readonly authService = inject(AuthService);

  private readonly tasksSubject = new BehaviorSubject<Task[]>([]);
  readonly tasks$: Observable<Task[]> = this.tasksSubject.asObservable();

  constructor() {
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

  async addTaskAsync(text: string, source: 'dashboard' | 'calendar', date?: string): Promise<Task> {
    const task: Task = { id: Date.now(), text, completed: false, source, date };
    const tasks = [...this.getTasks(), task];
    this.save(tasks);
    return task;
  }

  addTask(text: string, source: 'dashboard' | 'calendar', date?: string) {
    void this.addTaskAsync(text, source, date);
  }

  toggleTask(id: number) {
    const tasks = this.getTasks().map((task) =>
      task.id === id ? { ...task, completed: !task.completed } : task
    );
    this.save(tasks);
  }

  deleteTask(id: number) {
    const tasks = this.getTasks().filter((task) => task.id !== id);
    this.save(tasks);
  }

  async syncWithBackend(): Promise<Task[]> {
    const tasks = this.getTasks();
    await firstValueFrom(this.tasks$);
    return tasks;
  }

  private save(tasks: Task[]) {
    this.tasksSubject.next(tasks);
    this.storage.set(this.StorageKey(), tasks);
  }
}
