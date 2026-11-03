import { Component, inject, signal } from '@angular/core';
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

  /** A signal: the router event arrives outside a DOM event, and the app is zoneless. */
  readonly showSidebar = signal(true);
  private readonly hiddenRoutes = ['/login', '/signup'];

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.showSidebar.set(!this.hiddenRoutes.includes(event.urlAfterRedirects));
      }
    });
  }
}