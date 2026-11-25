import { Component, inject, afterNextRender } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Sidebar } from './components/sidebar/sidebar';
import { bootMotion, observeReveals } from './shared/motion/motion';
import { SmoothScroll } from './shared/motion/smooth-scroll';
import { initPointerMotion, markMagneticDefaults } from './shared/motion/pointer';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Sidebar, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly router = inject(Router);
  private readonly smoothScroll = inject(SmoothScroll);
  private readonly hiddenRoutes = ['/login', '/signup'];

  // Derivado de la ruta actual (no arranca en true): elimina el flash del
  // sidebar cuando la primera navegación aterriza en /login o /signup.
  // Se compara por pathname, no por URL completa: /login?registered=true
  // (redirección del signup) debe ocultar el shell igual que /login.
  showSidebar = !this.isAuthRoute(this.router.url);

  // La capa de movimiento se habilita recién cuando este componente existe:
  // si el script no corre, `data-motion` nunca se aplica y el marcado queda en
  // su estado visible por defecto.
  private readonly stopMotion = bootMotion(document.documentElement);
  private stopReveals: () => void = () => {};
  // Capa de puntero fino: se engancha una sola vez por sesión. Su delegación
  // resuelve los objetivos nuevos de cada ruta; sólo los atributos por defecto
  // se re-marcan en la navegación.
  private stopPointer: () => void = () => {};

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.showSidebar = !this.isAuthRoute(event.urlAfterRedirects);
        // La vista nueva ya está en el DOM cuando termina la CD de esta tarea.
        setTimeout(() => this.syncMotionLayer(), 0);
      }
    });

    afterNextRender(() => {
      this.stopPointer = initPointerMotion();
      this.syncMotionLayer();
    });
  }

  /**
   * Todo lo que depende del DOM de la ruta activa, en un solo punto: reveals,
   * opt-in magnético y la instancia de scroll suave (su nodo de contenido
   * cambia por ruta; en /login y /signup directamente no hay `.main-content`).
   */
  private syncMotionLayer(): void {
    markMagneticDefaults(document);
    this.collectReveals();
    this.smoothScroll.sync();
  }

  private collectReveals(): void {
    this.stopReveals();
    this.stopReveals = observeReveals(document);
  }

  ngOnDestroy(): void {
    this.stopReveals();
    this.stopPointer();
    this.smoothScroll.teardown();
    this.stopMotion();
  }

  private isAuthRoute(url: string): boolean {
    const pathname = new URL(url, window.location.origin).pathname;
    return this.hiddenRoutes.includes(pathname);
  }
}
