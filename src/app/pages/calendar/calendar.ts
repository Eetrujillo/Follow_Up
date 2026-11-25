import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendarApiService } from '../../shared/services/calendar-api.service';
import { duration, observeReveals } from '../../shared/motion/motion';

// Espejan los tokens --slow y --fast de frontend/src/styles.css: si cambian allá,
// hay que cambiarlos acá (el JS sólo necesita saber cuándo termina la transición
// que el CSS ya declara con esos mismos tokens).
const SLOW_MS = 260;
const FAST_MS = 140;

type MonthDirection = 'next' | 'prev' | null;

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
export class Calendar implements OnDestroy {
  today       = new Date();
  currentDate = new Date();

  // Capa de movimiento del cambio de mes. `dir` es el sentido en curso y
  // `arriving` es el cuadro en el que el mes entrante arranca en el borde
  // contrario con la transición apagada: después interpola desde ahí.
  dir: MonthDirection = null;
  arriving = false;

  // Salida del modal: se desmonta recién cuando termina su transición.
  modalOut = false;

  private queuedMonths = 0;
  private exitTimer = 0;
  private closeTimer = 0;
  private arriveFrame = 0;
  private stopRows: () => void = () => {};

  private readonly cdr = inject(ChangeDetectorRef);

  showModal     = false;
  showEventsModal = false;
  selectedDay   = 0;
  selectedDayEvents: CalendarEvent[] = [];
  newEventTitle = '';
  // Estos hex espejan los tokens --ev-1..--ev-5 de frontend/src/styles.css: si cambian allá, hay que cambiarlos acá (el backend valida colorHex con @IsHexColor).
  newEventColor = '#e0b155';
  editingEventId: string | null = null;

  colors = ['#e0b155', '#e2836f', '#8fb3d9', '#98c29a', '#b899cc'];
  colorNames = ['Ámbar', 'Rojo', 'Azul', 'Verde', 'Violeta'];

  events: CalendarEvent[] = [];

  private readonly calendarApi = inject(CalendarApiService);

  readonly titleInput = viewChild<ElementRef<HTMLInputElement>>('titleInput');
  readonly listCloseBtn = viewChild<ElementRef<HTMLButtonElement>>('listCloseBtn');
  readonly weeksGrid = viewChild<ElementRef<HTMLElement>>('weeksGrid');

  constructor() {
    this.reload();

    // Foco inicial de los modales: input del evento, o botón de cierre del modal de lista.
    effect(() => {
      const input = this.titleInput();
      const listClose = this.listCloseBtn();
      if (input) {
        input.nativeElement.focus();
      } else if (listClose) {
        listClose.nativeElement.focus();
      }
    });
  }

  private reload(): void {
    this.calendarApi.getAll().subscribe({
      next: (events) => {
        this.events = events.map((event) => ({
          id: event.id,
          // eventDate llega como la medianoche UTC del día calendario elegido
          // (backend/src/calendar/calendar.service.ts: Date.UTC(year, month - 1, day)).
          // Hay que decodificarla con getters UTC: con los locales, en husos negativos
          // (America/Lima, UTC-5) esa medianoche UTC es todavía el día anterior a las 19:00
          // y el evento se pintaba una celda antes, o en el mes anterior si era día 1.
          ...this.toCalendarDay(event.eventDate),
          title: event.title,
          color: event.colorHex,
        }));
      },
      error: () => {
        this.events = [];
      },
    });
  }

  private toCalendarDay(eventDate: string): { day: number; month: number; year: number } {
    const date = new Date(eventDate);
    if (Number.isNaN(date.getTime())) {
      return { day: 0, month: -1, year: 0 };
    }
    return {
      day: date.getUTCDate(),
      month: date.getUTCMonth(),
      year: date.getUTCFullYear(),
    };
  }

  get monthName(): string {
    return this.currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
  }

  get monthHasEvents(): boolean {
    const month = this.currentDate.getMonth();
    const year = this.currentDate.getFullYear();
    return this.events.some((e) => e.month === month && e.year === year);
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

  /** Las celdas agrupadas de a 7: una fila por semana, que es la que asienta. */
  get weeks(): Day[][] {
    const days = this.days;
    const weeks: Day[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    return weeks;
  }

  prevMonth() {
    this.shiftMonth(-1);
  }

  nextMonth() {
    this.shiftMonth(1);
  }

  /**
   * Cambio de mes con dirección: el mes que sale se corre hacia el sentido del
   * cambio y se apaga; recién cuando terminó se pinta el nuevo, que arranca en
   * el borde contrario y asienta. Sólo `opacity` y `transform`. Las clases
   * llevan `[data-motion='on']`: sin la capa de movimiento no se aplica nada.
   */
  private shiftMonth(delta: number): void {
    this.queuedMonths += delta;

    // Sin movimiento (o con los tokens en cero) el mes cambia en el acto.
    if (!duration(SLOW_MS)) {
      this.applyQueuedMonths();
      this.cdr.markForCheck();
      return;
    }

    // Ya hay una salida en curso: el salto se suma y se aplica de una sola vez.
    if (this.dir) return;

    this.leave();
  }

  private leave(): void {
    if (!this.queuedMonths) return;

    this.dir = this.queuedMonths > 0 ? 'next' : 'prev';
    // Las filas de semana se van con el mes que sale y vuelven a entrar abajo.
    this.weeksGrid()?.nativeElement.classList.remove('is-in');
    this.exitTimer = window.setTimeout(() => this.swapMonth(), SLOW_MS);
    this.cdr.markForCheck();
  }

  private swapMonth(): void {
    // El sentido de la llegada es el del salto acumulado; si se canceló
    // (adelante y después atrás), se mantiene el de la salida.
    const forward = this.queuedMonths !== 0 ? this.queuedMonths > 0 : this.dir === 'next';
    this.applyQueuedMonths();

    this.dir = forward ? 'next' : 'prev';
    this.arriving = true;
    this.cdr.markForCheck();

    // Cuadro siguiente: se sueltan las clases y la grilla interpola a su lugar
    // mientras el observer reparte el `.is-in` de las filas de semana.
    this.arriveFrame = window.requestAnimationFrame(() => {
      this.arriveFrame = window.requestAnimationFrame(() => {
        this.arriving = false;
        this.dir = null;
        this.stopRows();
        this.stopRows = observeReveals(document);
        this.cdr.markForCheck();

        // Un clic que llegó durante la llegada no se pierde: encadena su salida.
        if (this.queuedMonths) this.leave();
      });
    });
  }

  private applyQueuedMonths(): void {
    const delta = this.queuedMonths;
    this.queuedMonths = 0;
    if (!delta) return;
    const current = this.currentDate;
    this.currentDate = new Date(current.getFullYear(), current.getMonth() + delta, 1);
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

  /**
   * Cierre con salida: el modal se apaga con el token rápido y recién ahí se
   * desmonta. Con movimiento reducido se desmonta en el acto.
   */
  closeModal() {
    if (!this.showModal) return;

    const exit = duration(FAST_MS);
    if (!exit) {
      this.unmountModal();
      return;
    }

    this.modalOut = true;
    this.closeTimer = window.setTimeout(() => this.unmountModal(), exit);
    this.cdr.markForCheck();
  }

  private unmountModal(): void {
    this.showModal = false;
    this.modalOut = false;
    this.editingEventId = null;
    this.newEventTitle = '';
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    this.stopRows();
    window.clearTimeout(this.exitTimer);
    window.clearTimeout(this.closeTimer);
    window.cancelAnimationFrame(this.arriveFrame);
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

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.showEventsModal) {
      this.showEventsModal = false;
    } else if (this.showModal) {
      this.closeModal();
    }
  }

}
