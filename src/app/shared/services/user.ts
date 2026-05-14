import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private apiUrl = 'http://localhost:3000/users';

  constructor(private http: HttpClient) {}

  register(name: string, email: string, password: string): Observable<User> {
    const ts = Date.now();
    return this.http.get<User[]>(`${this.apiUrl}?email=${email}&_=${ts}`).pipe(
      switchMap((users) => {
        console.log('GET users response:', users);
        const list = users ?? [];
        if (list.length > 0) {
          console.log('Correo ya existe');
          return throwError(() => new Error('Este correo ya está registrado'));
        }
        const newUser: User = {
          id: Date.now(),
          name,
          email,
          password,
          createdAt: new Date(),
        };
        console.log('POST new user:', newUser);
        return this.http.post<User>(this.apiUrl, newUser);
      }),
      catchError((err) => {
        console.error('Error en register()', err);
        const msg = err?.error?.message || err?.message || 'Error en el servidor';
        return throwError(() => new Error(msg));
      }),
    );
  }

  authenticateUser(email: string, password: string): Observable<User | null> {
    return this.http
      .get<User[]>(`${this.apiUrl}?email=${email}&password=${password}`)
      .pipe(map((users) => (users.length > 0 ? users[0] : null)));
  }

  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl);
  }

  getUserById(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`);
  }

  updateUser(id: number, userData: Partial<User>): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/${id}`, userData);
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
