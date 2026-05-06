import { Injectable } from '@angular/core';

export interface TimerState {
  segundos: number;
  isRunning: boolean;
  startedAt: number | null;
}

const STORAGE_KEY = 'dashboard_timer';

@Injectable({ providedIn: 'root' })
export class TimerService {

  save(state: TimerState) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  restore(): TimerState {
    const raw = localStorage.getItem(STORAGE_KEY);
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
