import { Injectable } from '@angular/core';
import { User } from '../models/user.model';
import usersData from '../mocks/users.mock.json';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private users: User[] = [];

  constructor() {
    this.loadMockUsers();
  }

  private loadMockUsers(): void {
    this.users = usersData.map(user => ({
      ...user,
      createdAt: new Date(user.createdAt)
    }));
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

  authenticateUser(email: string, password: string): User | null {
    const user = this.getUserByEmail(email);
    if (user && user.password === password) {
      return user;
    }
    return null;
  }

  private generateId(): number {
    return this.users.length > 0 ? Math.max(...this.users.map(u => u.id)) + 1 : 1;
  }
}
