import { Injectable } from '@angular/core';
import { Observable, throwError, switchMap, map } from 'rxjs';
import { JsonbinService, User } from './jsonbin.service';
export type { User } from './jsonbin.service';

@Injectable({ providedIn: 'root' })
export class UserService {

  constructor(private jsonbin: JsonbinService) {}

  // Registrar nuevo usuario
  register(name: string, email: string, password: string): Observable<User> {
    return this.jsonbin.getUsers().pipe(
      switchMap(users => {
        // Verificar si el email ya existe
        const exists = users.find(u => u.email === email);
        if (exists) {
          return throwError(() => new Error('Este correo ya esta registrado'));
        }

        const newUser: User = {
          id:        Date.now().toString(),
          name,
          email,
          password,
          createdAt: new Date().toISOString()
        };

        const updated = [...users, newUser];

        return this.jsonbin.saveUsers(updated).pipe(
          map(() => newUser)
        );
      })
    );
  }

  // Verificar credenciales
  authenticateUser(email: string, password: string): Observable<User | null> {
    return this.jsonbin.getUsers().pipe(
      map(users => {
        const user = users.find(
          u => u.email === email && u.password === password
        );
        return user || null;
      })
    );
  }
}