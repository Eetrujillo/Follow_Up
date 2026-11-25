import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';

export interface TimerState {
  segundos: number;
  isRunning: boolean;
  startedAt: number | null;
}

const STORAGE_KEY_PREFIX = 'dashboard_timer';

@Injectable({ providedIn: 'root' })
export class TimerService {
  private readonly authService = inject(AuthService);

  /**
   * The countdown belongs to a person: on a shared browser the next account must
   * not resume the previous one's timer. Guests keep their own bucket.
   */
  private get storageKey(): string {
    return `${STORAGE_KEY_PREFIX}_${this.authService.getCurrentUser()?.id ?? 'guest'}`;
  }

  save(state: TimerState) {
    localStorage.setItem(this.storageKey, JSON.stringify(state));
  }

  restore(): TimerState {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return { segundos: 25 * 60, isRunning: false, startedAt: null };
    }

    const state: TimerState = JSON.parse(raw);

    if (state.isRunning && state.startedAt) {
      const elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
      state.segundos = Math.max(0, state.segundos - elapsed);
      if (state.segundos === 0) {
        state.isRunning = false;
        state.startedAt = null;
      } else {
        state.startedAt = Date.now(); 
      }
    }

    return state;
  }
}
