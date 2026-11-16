import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Calendar } from './calendar';

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
