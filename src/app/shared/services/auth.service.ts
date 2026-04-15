import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { User } from '../models/user.model';
import { UserService } from './user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly authUrl = '/api/auth/login';
  private currentUser: any = null;

  constructor(
    private http: HttpClient,
    private userService: UserService
  ) {}

  login(email: string, password: string): Observable<boolean> {
    if (!email || !password) {
      return throwError(() => new Error('Faltan datos'));
    }

    return this.http.post<User>(this.authUrl, { email, password }).pipe(
      map(user => {
        if (!user || !user.email) throw new Error('Usuario no encontrado');
        this.currentUser = user;
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('currentUser', JSON.stringify(user));
        return true;
      }),
      catchError(() => {
        const fallbackUser = this.userService.authenticateUser(email, password);
        if (fallbackUser) {
          this.currentUser = fallbackUser;
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('currentUser', JSON.stringify(fallbackUser));
          return of(true);
        }
        return of(false);
      })
    );
  }

  logout(): void {
    this.currentUser = null;
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('currentUser');
  }

  isLoggedIn(): boolean {
    return localStorage.getItem('isLoggedIn') === 'true';
  }

  getCurrentUser(): any {
    if (this.currentUser) return this.currentUser;
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  }
}