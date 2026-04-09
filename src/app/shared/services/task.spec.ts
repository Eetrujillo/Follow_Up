import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { StorageService } from './storage';

export interface Task {
  id: number;
  text: string;
  completed: boolean;
  source: 'dashboard' | 'calendar';
  date?: string; 
}

@Injectable({
  providedIn: 'root'
})
export class TaskService {

  private tasksSubject = new BehaviorSubject<Task[]>([]);
  tasks$ = this.tasksSubject.asObservable();

  constructor(private storage: StorageService) {
    
    const saved = this.storage.get<Task[]>('all_tasks', [
      { id: 1, text: 'Revisar notas de React Hooks',       completed: false, source: 'dashboard' },
      { id: 2, text: 'Completar ejercicios de TypeScript',  completed: true,  source: 'dashboard' },
      { id: 3, text: 'Leer capitulo 5 del libro',           completed: false, source: 'dashboard' },
      { id: 4, text: 'Preparar presentacion semanal',       completed: false, source: 'dashboard' },
    ]);
    this.tasksSubject.next(saved);
  }

  getTasks(): Task[] {
    return this.tasksSubject.getValue();
  }

  addTask(text: string, source: 'dashboard' | 'calendar', date?: string) {
    const tasks = this.getTasks();
    tasks.push({
      id: Date.now(),
      text,
      completed: false,
      source,
      date
    });
    this.save(tasks);
  }

  toggleTask(id: number) {
    const tasks = this.getTasks().map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    this.save(tasks);
  }

  deleteTask(id: number) {
    const tasks = this.getTasks().filter(t => t.id !== id);
    this.save(tasks);
  }

  private save(tasks: Task[]) {
    this.tasksSubject.next(tasks);
    this.storage.set('all_tasks', tasks);
  }
}