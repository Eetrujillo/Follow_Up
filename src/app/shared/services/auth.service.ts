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

  constructor(
    private http: HttpClient,
    private userService: UserService
  ) {}

  login(email: string, password: string): Observable<User> {
    if (!email || !password) {
      return throwError(() => new Error('Faltan datos: correo y contraseña son obligatorios'));
    }

    return this.http.post<User>(this.authUrl, { email, password }).pipe(
      map(user => {
        if (!user || !user.email) {
          throw new Error('No encontramos ninguna cuenta con ese correo');
        }
        return user;
      }),
      catchError(() => {
        const fallbackUser = this.userService.authenticateUser(email, password);
        if (fallbackUser) {
          return of(fallbackUser);
        }
        return throwError(() => new Error('Credenciales incorrectas o cuenta no registrada'));
      })
    );
  }
}
