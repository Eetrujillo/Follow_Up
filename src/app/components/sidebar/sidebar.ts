import { Component, HostListener } from '@angular/core';
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

  isCollapsed   = false;
  searchQuery   = '';
  searchResults: SearchResult[] = [];
  showResults   = false;

  navItems = [
   { label: 'Panel Principal', route: '/dashboard',  icon: '⊞' },
    { label: 'Biblioteca',      route: '/library',    icon: '▣' },
    { label: 'Calendario',      route: '/calendar',   icon: '▦' },
    { label: 'Estadisticas',    route: '/statistics', icon: '▤' },
    { label: 'Bloc de Notas',   route: '/notepad',    icon: '▧' },
  ];

  constructor(
    private router:        Router,
    private authService:   AuthService,
    private searchService: SearchService
  ) {}

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }

  onSearch() {
    if (!this.searchQuery.trim()) {
      this.searchResults = [];
      this.showResults   = false;
      return;
    }
    this.searchResults = this.searchService.search(this.searchQuery);
    this.showResults   = true;
  }

  goToResult(result: SearchResult) {
    this.router.navigate([result.route]);
    this.searchQuery = '';
    this.showResults = false;
  }

  clearSearch() {
    this.searchQuery   = '';
    this.searchResults = [];
    this.showResults   = false;
  }

  // Cerrar resultados al hacer clic afuera
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