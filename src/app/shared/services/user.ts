import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private apiUrl = 'https://api.jsonbin.io/v3/b/6a04ae5badc21f119a95e55d?meta=false';
  private masterKey = '$2a$10$q0nqh4E/UvD5nuOYdltOc.jSgg.qq3oL2CXEISoe2eRt4dwvUS3wC+';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'X-Master-Key': this.masterKey,
      'Content-Type': 'application/json'
    });
  }

  register(name: string, email: string, password: string): Observable<User> {
    return this.http.get<any>(this.apiUrl, { headers: this.getHeaders() }).pipe(
      switchMap((response) => {
        const users: User[] = Array.isArray(response) ? response : (response.record || []);
        
        console.log('GET users response:', users);
        
        const userExists = users.some(u => u.email === email);
        if (userExists) {
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
        return this.http.post<User>(this.apiUrl, newUser, { headers: this.getHeaders() });
      }),
      catchError((err) => {
        console.error('Error en register()', err);
        const msg = err?.error?.message || err?.message || 'Error en el servidor';
        return throwError(() => new Error(msg));
      }),
    );
  }

  authenticateUser(email: string, password: string): Observable<User | null> {
    return this.http.get<any>(this.apiUrl, { headers: this.getHeaders() }).pipe(
      map((response) => {
        const users: User[] = Array.isArray(response) ? response : (response.record || []);
        const foundUser = users.find((u) => u.email === email && u.password === password);
        return foundUser ? foundUser : null;
      })
    );
  }

  getAllUsers(): Observable<User[]> {
    return this.http.get<any>(this.apiUrl, { headers: this.getHeaders() }).pipe(
      map(response => Array.isArray(response) ? response : (response.record || []))
    );
  }

  getUserById(id: number): Observable<User> {
    return this.getAllUsers().pipe(
      map(users => {
        const user = users.find(u => u.id === id);
        if (!user) throw new Error('Usuario no encontrado');
        return user;
      })
    );
  }

  updateUser(id: number, userData: Partial<User>): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/${id}`, userData, { headers: this.getHeaders() });
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
}
