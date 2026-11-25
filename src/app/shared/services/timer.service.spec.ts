import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { TimerService } from './timer.service';
import { AuthService } from './auth.service';

/**
 * Per-user timer isolation.
 *
 * The suite runs with a single `--localstorage-file` shared by every spec file, so
 * these tests install their own in-memory storage instead of the process-wide one:
 * a stray `localStorage.clear()` in a parallel file must not be able to erase the
 * key this test just wrote.
 */
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

describe('TimerService', () => {
  function timerFor(userId: string | null): TimerService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            getCurrentUser: () =>
              userId ? { id: userId, fullName: '', email: '', createdAt: '' } : null,
          },
        },
      ],
    });
    return TestBed.inject(TimerService);
  }

  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('restores the timer of the same account', () => {
    timerFor('alice').save({ segundos: 120, isRunning: false, startedAt: null });

    expect(timerFor('alice').restore().segundos).toBe(120);
  });

  it('does not hand the previous account timer to the next one', () => {
    timerFor('alice').save({ segundos: 120, isRunning: false, startedAt: null });

    // On a shared browser the next session must start fresh, not resume Alice's
    // countdown.
    expect(timerFor('bob').restore().segundos).toBe(25 * 60);
  });

  it('resumes a running countdown from its epoch anchor', () => {
    timerFor('alice').save({ segundos: 600, isRunning: true, startedAt: Date.now() - 60_000 });

    const resumed = timerFor('alice').restore();
    expect(resumed.segundos).toBeGreaterThanOrEqual(538);
    expect(resumed.segundos).toBeLessThanOrEqual(540);
    expect(resumed.isRunning).toBe(true);
    expect(resumed.startedAt).not.toBeNull();
  });

  it('stops instead of going negative when the absence finished the countdown', () => {
    timerFor('alice').save({ segundos: 30, isRunning: true, startedAt: Date.now() - 100_000 });

    const resumed = timerFor('alice').restore();
    expect(resumed.segundos).toBe(0);
    expect(resumed.isRunning).toBe(false);
    expect(resumed.startedAt).toBeNull();
  });
});
