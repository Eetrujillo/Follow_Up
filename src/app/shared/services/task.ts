import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { BackendTask, TasksApiService } from './tasks-api.service';

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  source: 'dashboard' | 'calendar';
  date?: string;
}

function toTask(task: BackendTask): Task {
  return {
    id: task.id,
    text: task.description,
    completed: task.isCompleted,
    source: task.origin === 'CALENDAR' ? 'calendar' : 'dashboard',
    date: task.dueDate ?? undefined,
  };
}

/**
 * Tasks now live in PostgreSQL behind the API. The public surface is unchanged so
 * the pages keep working; only the storage moved.
 */
@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly api = inject(TasksApiService);
  private readonly tasksSubject = new BehaviorSubject<Task[]>([]);
  readonly tasks$: Observable<Task[]> = this.tasksSubject.asObservable();

  reloadForUser(): void {
    this.reload();
  }

  reload(): void {
    this.fetch().subscribe((tasks) => this.tasksSubject.next(tasks));
  }

  getTasks(): Task[] {
    return this.tasksSubject.getValue();
  }

  async addTaskAsync(text: string, source: 'dashboard' | 'calendar', date?: string): Promise<Task> {
    const created = await firstValueFrom(
      this.api.create({
        description: text,
        origin: source === 'calendar' ? 'CALENDAR' : 'DASHBOARD',
        dueDate: date,
      }),
    );

    const task = toTask(created);
    this.tasksSubject.next([...this.getTasks(), task]);
    return task;
  }

  addTask(text: string, source: 'dashboard' | 'calendar', date?: string): void {
    void this.addTaskAsync(text, source, date).catch(() => undefined);
  }

  toggleTask(id: string): void {
    const task = this.getTasks().find((current) => current.id === id);
    if (!task) {
      return;
    }

    this.api.update(id, { isCompleted: !task.completed }).subscribe({
      next: () => this.reload(),
      error: () => undefined,
    });
  }

  deleteTask(id: string): void {
    this.api.delete(id).subscribe({
      next: () => this.tasksSubject.next(this.getTasks().filter((task) => task.id !== id)),
      error: () => undefined,
    });
  }

  async syncWithBackend(): Promise<Task[]> {
    this.reload();
    return this.getTasks();
  }

  private fetch(): Observable<Task[]> {
    return this.api.getAll().pipe(
      map((tasks) => tasks.map(toTask)),
      catchError(() => of([])),
    );
  }
}
