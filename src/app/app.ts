import { Component, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Sidebar } from './components/sidebar/sidebar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Sidebar, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly router = inject(Router);
  private readonly hiddenRoutes = ['/login', '/signup'];

  // Derivado de la ruta actual (no arranca en true): elimina el flash del
  // sidebar cuando la primera navegación aterriza en /login o /signup.
  // Se compara por pathname, no por URL completa: /login?registered=true
  // (redirección del signup) debe ocultar el shell igual que /login.
  showSidebar = !this.isAuthRoute(this.router.url);

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.showSidebar = !this.isAuthRoute(event.urlAfterRedirects);
      }
    });
  }

  private isAuthRoute(url: string): boolean {
    const pathname = new URL(url, window.location.origin).pathname;
    return this.hiddenRoutes.includes(pathname);
  }
}
