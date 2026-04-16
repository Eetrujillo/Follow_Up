import { Routes } from '@angular/router';
import { Dashboard }  from './pages/dashboard/dashboard';
import { Library }    from './pages/library/library';
import { Calendar }   from './pages/calendar/calendar';
import { Statistics } from './pages/statistics/statistics';
import { Notepad }    from './pages/notepad/notepad';
import { Login }      from './pages/login/login';
import { Signup }     from './pages/signup/signup';
import { authGuard }  from './shared/guards/auth-guard';

export const routes: Routes = [
  { path: '',           redirectTo: 'login', pathMatch: 'full' },
  { path: 'login',      component: Login  },
  { path: 'signup',     component: Signup },
  { path: 'dashboard',  component: Dashboard,  canActivate: [authGuard] },
  { path: 'library',    component: Library,    canActivate: [authGuard] },
  { path: 'calendar',   component: Calendar,   canActivate: [authGuard] },
  { path: 'statistics', component: Statistics, canActivate: [authGuard] },
  { path: 'notepad',    component: Notepad,    canActivate: [authGuard] },
];