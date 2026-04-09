import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

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
  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }

  logout() {
    console.log('Cerrando sesion...');
  }
}