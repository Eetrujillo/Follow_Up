import { Component, inject } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendarApiService } from '../../shared/services/calendar-api.service';

interface CalendarEvent {
  id: string;
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
  editingEventId: string | null = null;

  colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  events: CalendarEvent[] = [];

  private readonly calendarApi = inject(CalendarApiService);

  constructor() {
    this.reload();
  }

  private reload(): void {
    this.calendarApi.getAll().subscribe({
      next: (events) => {
        this.events = events.map((event) => {
          const date = new Date(event.eventDate);
          return {
            id: event.id,
            day: date.getDate(),
            month: date.getMonth(),
            year: date.getFullYear(),
            title: event.title,
            color: event.colorHex,
          };
        });
      },
      error: () => {
        this.events = [];
      },
    });
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
    const title = this.newEventTitle.trim();
    if (!title) return;

    if (this.editingEventId) {
      this.calendarApi
        .update(this.editingEventId, { title, colorHex: this.newEventColor })
        .subscribe({
          next: () => {
            this.reload();
            this.closeModal();
          },
          error: () => this.closeModal(),
        });
      return;
    }

    this.calendarApi
      .create({
        title,
        colorHex: this.newEventColor,
        day: this.selectedDay,
        month: this.currentDate.getMonth() + 1,
        year: this.currentDate.getFullYear(),
      })
      .subscribe({
        next: () => {
          this.reload();
          this.closeModal();
        },
        error: () => this.closeModal(),
      });
  }

  deleteEvent() {
    if (!this.editingEventId) return;

    this.calendarApi.delete(this.editingEventId).subscribe({
      next: () => {
        this.reload();
        this.closeModal();
      },
      error: () => this.closeModal(),
    });
  }
  editFromList(ev: CalendarEvent, e: MouseEvent) {
    e.stopPropagation();
    this.showEventsModal = false;
    this.openEventModal(ev, e);
  }

}
