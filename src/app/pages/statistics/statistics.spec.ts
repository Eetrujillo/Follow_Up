import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';

import { Statistics } from './statistics';
import { StatsApiService } from '../../shared/services/stats-api.service';
import { TasksApiService } from '../../shared/services/tasks-api.service';
import { DocumentsApiService } from '../../shared/services/documents-api.service';

/**
 * Counters and streak now come from the API. This pins that the page renders what
 * the services return and registers the visit exactly once.
 */
describe('Statistics page', () => {
  let fixture: ComponentFixture<Statistics>;
  let visits: number;

  const tasks = [
    { id: 't1', description: 'Leer', isCompleted: true, origin: 'DASHBOARD' as const, dueDate: null, createdAt: '2026-01-05T10:00:00.000Z', completedAt: null },
    { id: 't2', description: 'Repasar', isCompleted: false, origin: 'DASHBOARD' as const, dueDate: null, createdAt: '2026-01-06T10:00:00.000Z', completedAt: null },
  ];

  const documents = [
    { id: 'd1', folderId: 'f1', userId: 'u1', title: 'Mitosis', contentHtml: '<p>x</p>', fromNotepad: true, createdAt: '2026-01-05T10:00:00.000Z', updatedAt: '2026-01-05T10:00:00.000Z' },
    { id: 'd2', folderId: 'f1', userId: 'u1', title: 'Meiosis', contentHtml: '<p>y</p>', fromNotepad: false, createdAt: '2026-01-06T10:00:00.000Z', updatedAt: '2026-01-06T10:00:00.000Z' },
  ];

  function arrange(streak: Observable<unknown>): void {
    visits = 0;

    TestBed.configureTestingModule({
      imports: [Statistics],
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: StatsApiService,
          useValue: {
            registerVisit: () => {
              visits += 1;
              return streak;
            },
            getStreak: () => streak,
          },
        },
        { provide: TasksApiService, useValue: { getAll: () => of(tasks) } },
        { provide: DocumentsApiService, useValue: { getAll: () => of(documents) } },
      ],
    });

    fixture = TestBed.createComponent(Statistics);
    fixture.detectChanges();
  }

  function statValue(index: number): string {
    const cards = fixture.debugElement.queryAll(By.css('.stat-card'));
    return (cards[index].query(By.css('.stat-value')).nativeElement.textContent as string).trim();
  }

  it('renders the streak days the API reports and registers one visit', async () => {
    arrange(of({ id: 's1', userId: 'u1', lastVisitDate: '2026-01-06T00:00:00.000Z', currentStreakDays: 5, updatedAt: null }));
    await fixture.whenStable();

    expect(visits).toBe(1);
    expect(statValue(1)).toBe('5');
  });

  it('aggregates totals from the fetched tasks and documents', async () => {
    arrange(of({ id: 's1', userId: 'u1', lastVisitDate: null, currentStreakDays: 3, updatedAt: null }));
    await fixture.whenStable();

    expect(statValue(0)).toBe('2');
    expect(fixture.nativeElement.textContent).toContain('1 completadas');
    expect(statValue(2)).toBe('2');
    expect(statValue(3)).toBe('30%');
  });

  it('shows the error line when the streak cannot be loaded', async () => {
    arrange(throwError(() => new Error('boom')));
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('No se pudo cargar la racha de estudio');
  });
});
