import { Component } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class Sidebar {

  isCollapsed = false;

  navItems = [
    { label: 'Panel Principal', route: '/dashboard',  icon: '⊞' },
    { label: 'Biblioteca',      route: '/library',    icon: '▣' },
    { label: 'Calendario',      route: '/calendar',   icon: '▦' },
    { label: 'Estadisticas',    route: '/statistics', icon: '▤' },
    { label: 'Bloc de Notas',   route: '/notepad',    icon: '▧' },
  ];

  constructor(
    private router:      Router,
    private authService: AuthService
  ) {}

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}