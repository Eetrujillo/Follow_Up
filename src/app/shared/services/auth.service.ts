import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Router } from '@angular/router';
import { UserService } from './user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isAuthenticated = false;
  private currentUser: any = null;

  constructor(private userService: UserService, private router: Router) {}

  login(email: string, password: string): Observable<boolean> {
    const user = this.userService.getUserByEmail(email);
    if (user && user.password === password) {
      this.isAuthenticated = true;
      this.currentUser = user;
      return of(true);
    }
    return of(false);
  }

  logout(): void {
    this.isAuthenticated = false;
    this.currentUser = null;
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated;
  }

  getCurrentUser(): any {
    return this.currentUser;
  }
}