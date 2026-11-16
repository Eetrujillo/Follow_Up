import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { Dashboard } from './dashboard';
import { AuthService } from '../../shared/services/auth.service';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

class MemoryStorage {
  private readonly items = new Map<string, string>();

  get length(): number {
    return this.items.size;
  }

  clear(): void {
    this.items.clear();
  }

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.items.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.items.delete(key);
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
}

/**
 * S7: the Pomodoro survives navigation. Leaving the dashboard must not erase the
 * state, and returning must resume the countdown from the epoch anchor that was
 * saved with it — the seconds that belong to the time the user was away.
 */
describe('Dashboard timer survival', () => {
  beforeEach(() => {
    // The suite shares one --localstorage-file across parallel files; these tests
    // isolate their own storage (see timer.service.spec.ts for the same pattern).
    vi.stubGlobal('localStorage', new MemoryStorage());
    TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        { provide: AuthService, useValue: { getCurrentUser: () => null } },
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });

  it('keeps the pomodoro state when leaving the page', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    const component = fixture.componentInstance;
    await fixture.whenStable();

    component.segundos = 600;
    (component as unknown as { savePomodoroState(): void }).savePomodoroState();
    fixture.destroy();

    const saved = localStorage.getItem('dashboard_timer_guest');
    expect(saved).not.toBeNull();
    expect(JSON.parse(saved!)).toEqual({ segundos: 600, isRunning: false, startedAt: null });
  });

  it('resumes the running countdown where the epoch left it', async () => {
    localStorage.setItem(
      'dashboard_timer_guest',
      JSON.stringify({ segundos: 600, isRunning: true, startedAt: Date.now() - 60_000 }),
    );

    const fixture = TestBed.createComponent(Dashboard);
    const component = fixture.componentInstance;
    await fixture.whenStable();
    try {
      expect(component.isRunning).toBe(true);
      // One minute passed while the user was away: 540 must remain, not 600.
      expect(component.segundos).toBeGreaterThanOrEqual(538);
      expect(component.segundos).toBeLessThanOrEqual(540);
      // The restored countdown must actually tick: the resume path starts the
      // interval even though isRunning was already true from storage.
      expect((component as unknown as { timerSub: unknown }).timerSub).toBeTruthy();
    } finally {
      fixture.destroy();
    }
  });
});