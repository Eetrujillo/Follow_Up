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
  private isAuthenticated = false;
  private currentUser: any = null;

  constructor(
    private http: HttpClient,
    private userService: UserService
  ) {}

  login(email: string, password: string): Observable<boolean> {
    if (!email || !password) {
      return throwError(() => new Error('Faltan datos: el correo y contraseña son obligatorios'));
    }

    return this.http.post<User>(this.authUrl, { email, password }).pipe(
      map(user => {
        if (!user || !user.email) {
          throw new Error('No encontramos ninguna cuenta con ese correo');
        }
        this.isAuthenticated = true;
        this.currentUser = user;
        return true;
      }),
      catchError(() => {
        const fallbackUser = this.userService.authenticateUser(email, password);
        if (fallbackUser) {
          this.isAuthenticated = true;
          this.currentUser = fallbackUser;
          return of(true);
        }
        return of(false);
      })
    );
  }

  logout(): void {
    this.isAuthenticated = false;
    this.currentUser = null;
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated;
  }

  getCurrentUser(): any {
    return this.currentUser;
  }
}
