import { Component, inject } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../shared/services/task';
import { StorageService } from '../../shared/services/storage';

interface CalendarEvent {
  id: number;
  day: number;
  month: number;
  year: number;
  title: string;
  color: string;
}

interface Day {
  number: number;
  isToday: boolean;
  isEmpty: boolean;
  events: CalendarEvent[];
}

@Component({
  selector: 'app-calendar',
  imports: [FormsModule, TitleCasePipe],
  templateUrl: './calendar.html',
  styleUrls: ['./calendar.css']
})
export class Calendar {
  today       = new Date();
  currentDate = new Date();

  showModal     = false;
  showEventsModal = false;
  selectedDay   = 0;
  selectedDayEvents: CalendarEvent[] = [];
  newEventTitle = '';
  newEventColor = '#3b82f6';
  editingEventId: number | null = null;

  colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  events: CalendarEvent[] = [];

  private readonly taskService = inject(TaskService);
  private readonly storage = inject(StorageService);

  constructor() {
    this.events = this.storage.get<CalendarEvent[]>('calendar_events', []);
  }

  get monthName(): string {
    return this.currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
  }

  get days(): Day[] {
    const year   = this.currentDate.getFullYear();
    const month  = this.currentDate.getMonth();
    const first  = new Date(year, month, 1).getDay();
    const total  = new Date(year, month + 1, 0).getDate();
    const offset = (first + 6) % 7;
    const days: Day[] = [];

    for (let i = 0; i < offset; i++) {
      days.push({ number: 0, isToday: false, isEmpty: true, events: [] });
    }

    for (let d = 1; d <= total; d++) {
      const isToday =
        d === this.today.getDate() &&
        month === this.today.getMonth() &&
        year === this.today.getFullYear();

      const dayEvents = this.events.filter(e =>
        e.day === d && e.month === month && e.year === year
      );

      days.push({ number: d, isToday, isEmpty: false, events: dayEvents });
    }

    return days;
  }

  prevMonth() {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
  }

  nextMonth() {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
  }

  openModal(day: Day) {
    if (day.isEmpty) return;
    this.selectedDay   = day.number;
    this.newEventTitle = '';
    this.newEventColor = this.colors[0];
    this.editingEventId = null;
    this.showModal = true;
  }

  openEventModal(ev: CalendarEvent, e?: MouseEvent) {
    e?.stopPropagation();
    this.selectedDay     = ev.day;
    this.newEventTitle   = ev.title;
    this.newEventColor   = ev.color;
    this.editingEventId  = ev.id;
    this.showModal       = true;
  }

  openEventsList(events: CalendarEvent[], e: MouseEvent) {
    e.stopPropagation();
    this.selectedDayEvents = events;
    this.showEventsModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.editingEventId = null;
    this.newEventTitle = '';
  }

  saveEvent() {
    if (!this.newEventTitle.trim()) return;

    if (this.editingEventId) {
      const existing = this.events.find(ev => ev.id === this.editingEventId);
      if (existing) {
        existing.title = this.newEventTitle.trim();
        existing.color = this.newEventColor;
      }
    } else {
      const newEvent: CalendarEvent = {
        id:    Date.now(),
        day:   this.selectedDay,
        month: this.currentDate.getMonth(),
        year:  this.currentDate.getFullYear(),
        title: this.newEventTitle.trim(),
        color: this.newEventColor
      };
      this.events.push(newEvent);
    }

    this.storage.set('calendar_events', this.events);
    this.closeModal();
  }

  deleteEvent() {
    if (this.editingEventId) {
      this.events = this.events.filter(ev => ev.id !== this.editingEventId);
      this.storage.set('calendar_events', this.events);
      this.closeModal();
    }
  }
  editFromList(ev: CalendarEvent, e: MouseEvent) {
    e.stopPropagation();
    this.showEventsModal = false;
    this.openEventModal(ev, e);
  }

}
