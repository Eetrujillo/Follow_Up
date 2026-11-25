/**
 * Hero WebGL del panel de identidad (login / signup) — filas 29-31 del
 * inventario de `odd/tasks/motion-redesign.md`.
 *
 * Este componente es dueño del ciclo de vida del canvas; la escena vive en
 * `ink-hero.ts` y no se toca desde acá. Lo que decide esta capa:
 *
 *  - Montaje perezoso: la escena se construye recién cuando el canvas está en
 *    vista. Antes de eso la capa muestra el fondo del panel, que es lo que ya
 *    existía, así que no hay salto visual.
 *  - Puertas de capacidad: sin puntero fino o con reducción de movimiento no
 *    se construye nada; el canvas queda `display: none` por CSS y se ve el
 *    póster estático (`.auth-hero__poster`).
 *  - Sin WebGL2 el constructor de `InkHero` lanza: se captura y se deja el
 *    póster. No es un error de la aplicación.
 *  - El puntero entra por el panel (`.auth-brand`), no por un listener global.
 *    El canvas no recibe eventos (`pointer-events: none`).
 *  - Todo se desmonta en `ngOnDestroy`, que es también la salida de la ruta de
 *    auth: el contexto WebGL no sobrevive a la navegación.
 */

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { InkHero } from './ink-hero';
import { prefersFinePointer, prefersReducedMotion, watchReducedMotion } from './motion';

@Component({
  selector: 'app-auth-hero',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <canvas #canvas class="auth-hero" aria-hidden="true"></canvas>
    <div class="auth-hero__poster" aria-hidden="true"></div>
  `,
})
export class AuthHero implements OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  private hero: InkHero | null = null;
  private observer: IntersectionObserver | null = null;
  private surface: HTMLElement | null = null;
  private stopWatch: () => void = () => {};
  private destroyed = false;

  constructor() {
    afterNextRender(() => {
      if (this.destroyed) return;

      // Si el usuario pasa a reducción de movimiento en vivo, la escena se
      // apaga y queda el póster. No se vuelve a encender sola: reiniciar un
      // hero WebGL sin un gesto del usuario es justo lo que la preferencia pide
      // evitar.
      this.stopWatch = watchReducedMotion((reduce) => {
        if (!reduce) return;
        this.teardown();
        this.fallback();
      });

      if (prefersReducedMotion() || !prefersFinePointer()) {
        this.fallback();
        return;
      }

      this.whenVisible();
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.stopWatch();
    this.teardown();
  }

  /** Construye la escena sólo cuando el canvas entró en viewport, una vez. */
  private whenVisible(): void {
    if (typeof IntersectionObserver === 'undefined') {
      this.create();
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        this.observer?.disconnect();
        this.observer = null;
        this.create();
      },
      { threshold: 0.01 },
    );
    this.observer.observe(this.canvasRef().nativeElement);
  }

  private create(): void {
    if (this.destroyed || this.hero) return;

    // La preferencia se re-evalúa en el momento de crear, no sólo al arrancar.
    if (prefersReducedMotion() || !prefersFinePointer()) {
      this.fallback();
      return;
    }

    try {
      this.hero = new InkHero(this.canvasRef().nativeElement);
    } catch {
      // Sin WebGL2 (o sin contexto disponible) no hay escena: queda el póster.
      this.hero = null;
      this.fallback();
      return;
    }

    const surface = this.host.nativeElement.parentElement;
    if (surface) {
      surface.addEventListener('pointermove', this.onPointerMove, { passive: true });
      this.surface = surface;
    }
  }

  /** Suelta listeners y contexto. Es idempotente: la usan el flip de RM y el destroy. */
  private teardown(): void {
    this.observer?.disconnect();
    this.observer = null;

    if (this.surface) {
      this.surface.removeEventListener('pointermove', this.onPointerMove);
      this.surface = null;
    }

    this.hero?.destroy();
    this.hero = null;
  }

  /** Deja el póster estático: la rama de degradación de las tres puertas. */
  private fallback(): void {
    this.host.nativeElement.classList.add('auth-hero-host--fallback');
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    this.hero?.onPointerMove(event.clientX, event.clientY);
  };
}
