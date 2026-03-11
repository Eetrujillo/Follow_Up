import { Routes } from '@angular/router';
import { Dashboard } from './pages/dashboard/dashboard';
import { Library } from './pages/library/library';
import { Calendar } from './pages/calendar/calendar';
import { Statistics } from './pages/statistics/statistics';
import { Notepad } from './pages/notepad/notepad';
import { Login } from './pages/login/login';
import { Signup } from './pages/signup/signup';

export const routes: Routes = [
  { path: '', redirectTo: 'signup', pathMatch: 'full' },
  { path: 'dashboard',   component: Dashboard },
  { path: 'library',     component: Library },
  { path: 'calendar',    component: Calendar },
  { path: 'statistics',  component: Statistics },
  { path: 'notepad',     component: Notepad },
  { path: 'login',       component: Login },
  { path: 'signup',      component: Signup },
];