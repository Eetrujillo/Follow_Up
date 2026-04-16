import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import usersData from '../mocks/users.mock.json';
import { User } from '../models/user';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';



@Injectable({
  providedIn: 'root',
})
export class UserService {
  private users: User[] = [];
    private apiUrl = 'http://localhost:3000/users';
  constructor(private http: HttpClient) {}
  
  register(name: string, email: string, password: string): Observable<User> {
    // Primero verificar que el email no exista
    return this.http.get<User[]>(`${this.apiUrl}?email=${email}`).pipe(
      map(users => {
        if (users.length > 0) {
          throw new Error('Este correo ya esta registrado');
        }
        return users;
      }),
      // Si no existe se crear
      map(() => {
        const newUser: User = {
          id: Date.now(),
          name,
          email,
          password,
          createdAt: new Date()
        };
        this.http.post<User>(this.apiUrl, newUser).subscribe();
        return newUser;
      }),
      catchError(err => throwError(() => err))
    );
  }

   authenticateUser(email: string, password: string): Observable<User | null> {
    return this.http.get<User[]>(
      `${this.apiUrl}?email=${email}&password=${password}`
    ).pipe(
      map(users => users.length > 0 ? users[0] : null)
    );
  }

  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl);
  }

  getUsers(): User[] {
    return [...this.users];
  }

  getUserById(id: number): User | undefined {
    return this.users.find(user => user.id === id);
  }

  getUserByEmail(email: string): User | undefined {
    return this.users.find(user => user.email === email);
  }

  createUser(userData: Omit<User, 'id' | 'createdAt'>): User {
    if (this.getUserByEmail(userData.email)) {
      throw new Error('El email ya está registrado');
    }

    const newUser: User = {
      id: this.generateId(),
      name: userData.name,
      email: userData.email,
      password: userData.password, 
      createdAt: new Date()
    };

    this.users.push(newUser);
    return newUser;
  }

  updateUser(id: number, userData: Partial<User>): User | null {
    const userIndex = this.users.findIndex(user => user.id === id);
    if (userIndex === -1) return null;

    this.users[userIndex] = { ...this.users[userIndex], ...userData };
    return this.users[userIndex];
  }

  deleteUser(id: number): boolean {
    const userIndex = this.users.findIndex(user => user.id === id);
    if (userIndex === -1) return false;

    this.users.splice(userIndex, 1);
    return true;
  }

  private generateId(): number {
  return this.users.length > 0 ? Math.max(...this.users.map(u=>u.id ?? 0)) + 1 : 1;
}

}
