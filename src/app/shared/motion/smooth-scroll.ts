/**
 * Scroll suave del contenido principal (Tier 4, inventario fila 32).
 *
 * Por qué un servicio y no un componente: el scroller es `.main-content`, que
 * vive en el shell (`app.ts`), pero su *contenido* es el host de la página
 * activa, y ese nodo cambia en cada ruta. Sin rehacer (o al menos re-medir) la
 * instancia en `NavigationEnd`, Lenis mide la altura del contenido anterior.
 *
 * Presupuesto: el asentamiento tiene que quedar ≤250ms (B6). Se usa
 * `duration: 0.25` con la misma curva cúbica de salida que el resto del
 * sistema, en vez del `lerp` por defecto, que no tiene techo de duración.
 *
 * Degradación: nunca se instancia con reducción de movimiento ni con puntero
 * grueso (en táctil el scroll nativo ya es la experiencia correcta). Cambiar
 * `prefers-reduced-motion` en vivo apaga la instancia; ver `sync()`.
 *
 * Loops: uno solo, acá. `autoRaf: false` para que Lenis no abra el suyo.
 */

import { Injectable } from '@angular/core';
import Lenis from 'lenis';
import { prefersFinePointer, prefersReducedMotion, watchReducedMotion } from './motion';

/** Techo de asentamiento (presupuesto B6: ≤250ms). */
const DURATION_S = 0.25;

/** Misma familia de curvas que los tokens: salida cúbica, sin overshoot. */
const EASING = (t: number): number => 1 - Math.pow(1 - t, 3);

@Injectable({ providedIn: 'root' })
export class SmoothScroll {
  private lenis: Lenis | null = null;
  private wrapper: HTMLElement | null = null;
  private content: HTMLElement | null = null;
  private frame = 0;

  constructor() {
    // Un usuario que cambia la preferencia a mitad de sesión no recarga la app.
    watchReducedMotion(() => this.sync());
  }

  /**
   * Punto único de entrada: se llama en el primer render del shell y después
   * de cada `NavigationEnd`. Decide solo si corresponde tener instancia:
   *  - sin `.main-content` (login / signup) → se apaga,
   *  - con reducción de movimiento o puntero grueso → se apaga,
   *  - con el mismo wrapper y el mismo contenido → sólo `resize()`,
   *  - si cambió el nodo de contenido → se rehace la instancia.
   */
  sync(): void {
    if (typeof document === 'undefined') return;

    const wrapper = document.querySelector<HTMLElement>('.main-content');
    if (!wrapper || prefersReducedMotion() || !prefersFinePointer()) {
      this.teardown();
      return;
    }

    const content = this.pageContent(wrapper);
    if (!content) {
      this.teardown();
      return;
    }

    if (this.lenis && this.wrapper === wrapper && this.content === content) {
      this.lenis.resize();
      return;
    }

    this.teardown();
    this.mount(wrapper, content);
  }

  /** Suelta la instancia y su rAF. Idempotente. */
  teardown(): void {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.lenis?.destroy();
    this.lenis = null;
    this.wrapper = null;
    this.content = null;
  }

  /**
   * El elemento que Angular inserta después de `<router-outlet>`: ése es el
   * contenido que Lenis tiene que medir.
   */
  private pageContent(wrapper: HTMLElement): HTMLElement | null {
    const outlet = wrapper.querySelector('router-outlet');
    const sibling = outlet ? outlet.nextElementSibling : wrapper.firstElementChild;
    return sibling instanceof HTMLElement ? sibling : null;
  }

  private mount(wrapper: HTMLElement, content: HTMLElement): void {
    this.wrapper = wrapper;
    this.content = content;

    // Un contenedor anidado con scroll propio (la lista de eventos del modal
    // del calendario, por ejemplo) scrollea nativo: si Lenis le robara el
    // wheel, el gesto movería la página en vez de la lista.
    //
    // Se resuelve por atributo declarativo, no midiendo: `prevent` corre en
    // cada evento de wheel, y un `getComputedStyle` ahí es un recálculo de
    // estilo por evento. Cuesta una lectura de atributo y nada más. El
    // contenedor se marca con `data-lenis-prevent` en su propia plantilla.
    const prevent = (node: HTMLElement): boolean => {
      if (node === wrapper) return false;
      return node.closest('[data-lenis-prevent]') !== null;
    };

    try {
      this.lenis = new Lenis({
        wrapper,
        content,
        duration: DURATION_S,
        easing: EASING,
        smoothWheel: true,
        // Táctil scrollea nativo: no se imita la inercia del sistema.
        syncTouch: false,
        wheelMultiplier: 1,
        prevent,
        // El rAF es el de este servicio; autoRaf abriría un segundo loop.
        autoRaf: false,
        // Segundo cinturón: si la preferencia cambia entre el chequeo y el
        // primer wheel, Lenis deja de suavizar por su cuenta.
        respectReducedMotion: true,
      });
    } catch {
      this.lenis = null;
      return;
    }

    this.frame = requestAnimationFrame(this.loop);
  }

  private readonly loop = (time: number): void => {
    const lenis = this.lenis;
    if (!lenis) {
      this.frame = 0;
      return;
    }
    lenis.raf(time);
    this.frame = requestAnimationFrame(this.loop);
  };
}
