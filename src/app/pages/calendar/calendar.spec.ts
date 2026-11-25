import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { Calendar } from './calendar';
import { BackendCalendarEvent, CalendarApiService } from '../../shared/services/calendar-api.service';

// Contrato del backend: colorHex se valida con @IsHexColor() en
// create-calendar-event.dto.ts y update-calendar-event.dto.ts.
const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

describe('Calendar', () => {
  let component: Calendar;
  let fixture: ComponentFixture<Calendar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Calendar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Calendar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('colorHex es un hex válido (contrato @IsHexColor del backend)', async () => {
    // Los swatches viajan al backend como colorHex: todos deben ser hex reales.
    for (const color of component.colors) {
      expect(color).toMatch(HEX_COLOR);
    }

    // Crear evento: el color inicial y el elegido tras abrir el modal son hex.
    expect(component.newEventColor).toMatch(HEX_COLOR);
    component.openModal({ number: 3, isToday: false, isEmpty: false, events: [] });
    expect(component.newEventColor).toMatch(HEX_COLOR);

    // Editar un evento viejo guardado con hex: el swatch vuelve a quedar marcado.
    component.openEventModal({
      id: 'e1', day: 3, month: 0, year: 2026, title: 'Retrospectiva', color: '#e0b155',
    });
    expect(component.newEventColor).toMatch(HEX_COLOR);
    fixture.changeDetectorRef.markForCheck();
    await fixture.whenStable();
    const swatch = fixture.nativeElement.querySelector('.swatch');
    expect(swatch).toBeTruthy();
    expect(swatch.getAttribute('aria-pressed')).toBe('true');
  });
});

// El backend guarda eventDate como la medianoche UTC del día calendario elegido
// (backend/src/calendar/calendar.service.ts: new Date(Date.UTC(year, month - 1, day))).
const storedEvent = (id: string, eventDate: string): BackendCalendarEvent => ({
  id,
  title: `Evento ${id}`,
  colorHex: '#e0b155',
  eventDate,
  linkedTaskId: null,
  createdAt: eventDate,
});

describe('Calendar · día calendario guardado como medianoche UTC', () => {
  let component: Calendar;
  let fixture: ComponentFixture<Calendar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Calendar] })
      .overrideProvider(CalendarApiService, {
        useValue: {
          getAll: () =>
            of([
              storedEvent('mid-month', '2026-03-15T00:00:00.000Z'),
              storedEvent('first-of-month', '2026-04-01T00:00:00.000Z'),
            ]),
          create: () => of({}),
          update: () => of({}),
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(Calendar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('pinta el 15 de marzo en el 15 y no en el 14', () => {
    component.currentDate = new Date(2026, 2, 1);

    const days = component.days;
    expect(days.find((d) => d.number === 15)!.events.map((e) => e.id)).toEqual(['mid-month']);
    expect(days.find((d) => d.number === 14)!.events).toEqual([]);
  });

  it('pinta el 1 de abril en abril y no en el 31 de marzo', () => {
    component.currentDate = new Date(2026, 3, 1);

    expect(component.monthHasEvents).toBe(true);
    expect(component.days.find((d) => d.number === 1)!.events.map((e) => e.id)).toEqual([
      'first-of-month',
    ]);
  });
});
