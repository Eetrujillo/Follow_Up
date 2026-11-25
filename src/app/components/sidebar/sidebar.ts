import {
  Component,
  ElementRef,
  HostListener,
  afterNextRender,
  inject,
  viewChild,
  viewChildren,
} from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
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

  private readonly ink = viewChild<ElementRef<HTMLElement>>('navInk');
  private readonly navRefs = viewChildren<ElementRef<HTMLElement>>('navItem');

  navItems = [
    { label: 'Panel Principal', route: '/dashboard', icon: 'home' },
    { label: 'Biblioteca', route: '/library', icon: 'folder' },
    { label: 'Calendario', route: '/calendar', icon: 'calendar' },
    { label: 'Estadisticas', route: '/statistics', icon: 'chart' },
    { label: 'Bloc de Notas', route: '/notepad', icon: 'note' },
  ];

  constructor() {
    afterNextRender(() => this.syncInk());
    // RouterLinkActive se aplica durante la CD que sigue a NavigationEnd: la
    // marca se reposiciona después, no antes.
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) setTimeout(() => this.syncInk(), 0);
    });
  }

  /**
   * Coloca el marcador sobre el ítem activo.
   * Todas las lecturas en una pasada y después una sola escritura: nunca se
   * lee geometría entre dos escrituras de estilo.
   */
  private syncInk(): void {
    const ink = this.ink()?.nativeElement;
    if (!ink) return;

    const items = this.navRefs().map((ref) => ref.nativeElement);
    if (!items.length) return;

    const metrics = items.map((el) => ({
      top: el.offsetTop,
      height: el.offsetHeight,
      active: el.classList.contains('active'),
    }));
    const active = metrics.find((m) => m.active);

    if (!active) {
      ink.style.opacity = '0';
      return;
    }
    ink.style.height = `${active.height}px`;
    ink.style.transform = `translateY(${active.top}px)`;
    ink.style.opacity = '1';
  }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
    // El riel no anima ancho (re-layout del shell entero): la geometría es
    // instantánea y sólo las etiquetas se desvanecen.
    setTimeout(() => this.syncInk(), 0);
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
    // El contenedor real del buscador es `.search-wrap`; el selector anterior
    // (`.sidebar-search-wrap`) no existía y el cierre por clic afuera nunca
    // disparaba.
    if (!target.closest('.search-wrap')) {
      this.showResults = false;
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
