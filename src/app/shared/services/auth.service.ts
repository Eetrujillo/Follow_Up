import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { UserService } from './user';
import { User } from '../models/user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = 'http://localhost:3000/users';
  private currentUser: User | null = null;

  constructor(
    private http:        HttpClient,
    private userService: UserService
  ) {}

  login(email: string, password: string): Observable<boolean> {
    if (!email || !password) {
      return throwError(() => new Error('Correo y contrasena son obligatorios'));
    }

    return this.userService.authenticateUser(email, password).pipe(
      map(user => {
        if (user) {
          this.currentUser = user;
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('currentUser', JSON.stringify(user));
          return true;
        }
        return false;
      }),
      catchError(() => of(false))
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

  getCurrentUser(): User | null {
    if (this.currentUser) return this.currentUser;
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  }
}