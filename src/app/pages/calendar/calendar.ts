import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Event {
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
  events: Event[];
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendar.html',
  styleUrl: './calendar.css'
})
export class Calendar {

  today       = new Date();
  currentDate = new Date();

  showModal    = false;
  selectedDay  = 0;
  newEventTitle = '';
  newEventColor = '#3b82f6';

  colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  events: Event[] = [];

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
    this.currentDate = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth() - 1, 1
    );
  }

  nextMonth() {
    this.currentDate = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth() + 1, 1
    );
  }

  openModal(day: Day) {
    if (day.isEmpty) return;
    this.selectedDay   = day.number;
    this.newEventTitle = '';
    this.newEventColor = '#3b82f6';
    this.showModal     = true;
  }

  closeModal() {
    this.showModal = false;
  }

  saveEvent() {
    if (!this.newEventTitle.trim()) return;
    this.events.push({
      id:     Date.now(),
      day:    this.selectedDay,
      month:  this.currentDate.getMonth(),
      year:   this.currentDate.getFullYear(),
      title:  this.newEventTitle.trim(),
      color:  this.newEventColor
    });
    this.closeModal();
  }

  deleteEvent(eventId: number, e: MouseEvent) {
    e.stopPropagation();
    this.events = this.events.filter(ev => ev.id !== eventId);
  }
}