import { Component, HostListener, inject } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../shared/services/auth.service';
import { SearchService, SearchResult } from '../../shared/services/search';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class Sidebar {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly searchService = inject(SearchService);

  // Ancho por debajo del cual la barra de 180px deja el contenido sin aire
  // (cabecera encimada, nombres de documento recortados a cero).
  private static readonly RAIL_BREAKPOINT = 700;

  isCollapsed = window.innerWidth <= Sidebar.RAIL_BREAKPOINT;
  searchQuery = '';
  searchResults: SearchResult[] = [];
  showResults = false;

  navItems = [
    { label: 'Panel Principal', route: '/dashboard', icon: 'home' },
    { label: 'Biblioteca', route: '/library', icon: 'folder' },
    { label: 'Calendario', route: '/calendar', icon: 'calendar' },
    { label: 'Estadisticas', route: '/statistics', icon: 'chart' },
    { label: 'Bloc de Notas', route: '/notepad', icon: 'note' },
  ];

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }

  onSearch() {
    if (!this.searchQuery.trim()) {
      this.searchResults = [];
      this.showResults = false;
      return;
    }

    this.searchResults = this.searchService.search(this.searchQuery);
    this.showResults = true;
  }

  goToResult(result: SearchResult) {
    this.router.navigate([result.route]);
    this.searchQuery = '';
    this.showResults = false;
  }

  clearSearch() {
    this.searchQuery = '';
    this.searchResults = [];
    this.showResults = false;
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(e: Event) {
    const target = e.target as HTMLElement;
    if (!target.closest('.sidebar-search-wrap')) {
      this.showResults = false;
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}