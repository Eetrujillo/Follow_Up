/**
 * Capa de puntero fino (Tier 4): anillo de acento, magnetismo y tilt.
 *
 * Un solo loop de rAF para todo el trabajo de puntero. El handler `pointermove`
 * sólo guarda coordenadas: ninguna lectura de layout y ningún tween adentro.
 * La geometría de cada objetivo se cachea una vez, en el `pointerover` que lo
 * engancha, y se invalida en scroll/resize.
 *
 * Atributos de opt-in (el contrato es el atributo, no una clase):
 *  - `data-magnetic`: el elemento se desplaza hasta 6px hacia el puntero
 *    mientras el puntero está adentro (fracción 0.25 de la distancia al
 *    centro, con tope).
 *  - `data-tilt`: el elemento se inclina hasta 3.5deg con `perspective(800px)`
 *    escrita inline. Sólo hay UN elemento inclinado a la vez; al salir vuelve
 *    a `transform: none` en `--t-micro`.
 * Los valores por defecto del sistema (riel de navegación y botón primario)
 * entran por `markMagneticDefaults()`. Nada más se anima sin atributo.
 *
 * Degradación: sin puntero fino o con reducción de movimiento la capa ni se
 * crea. El cursor nativo nunca se oculta: el anillo es un indicador extra.
 * El loop se detiene cuando el puntero sale de la ventana y cuando se pide
 * reducción de movimiento en vivo.
 */

import { prefersFinePointer, prefersReducedMotion, watchReducedMotion } from './motion';

const MAGNETIC = '[data-magnetic]';
const TILT = '[data-tilt]';

/** Anillo: 10px, lerp 0.15 por frame (sigue al puntero, no lo tapa). */
const RING_LERP = 0.15;

/** Magnetismo: fracción de la distancia al centro, con tope de 6px. */
const MAGNET_RATIO = 0.25;
const MAGNET_MAX = 6;

/** Tilt: 3.5deg de tope y la misma perspectiva para todos los objetivos. */
const TILT_MAX = 3.5;
const TILT_PERSPECTIVE = 800;

/** Vuelta a reposo; refleja `--t-micro` (no hay forma de leer un token CSS como número). */
const RETURN_MS = 120;

const clamp = (value: number, max: number): number => Math.max(-max, Math.min(max, value));

/**
 * Escribe `data-magnetic` en las superficies que el sistema considera
 * magnéticas por defecto. Se llama después de cada navegación porque las
 * páginas se recrean; una superficie puede además declarar el atributo en su
 * propia plantilla y esta función no la toca.
 */
export function markMagneticDefaults(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('.nav-item, .btn--primary').forEach((el) => {
    if (el.hasAttribute('data-magnetic')) return;
    el.setAttribute('data-magnetic', '');
  });
}

/** Devuelve el teardown. Llamarlo dos veces es seguro. */
export function initPointerMotion(): () => void {
  if (typeof document === 'undefined') return () => {};
  if (prefersReducedMotion() || !prefersFinePointer()) return () => {};

  const ring = document.createElement('div');
  ring.className = 'm-cursor';
  ring.setAttribute('aria-hidden', 'true');
  document.body.appendChild(ring);

  /** Rect cacheado por objetivo; sólo se lee en enter y en scroll/resize. */
  const rects = new Map<HTMLElement, DOMRect>();
  /** Timers de retorno, para poder cancelarlos si el puntero vuelve a entrar. */
  const returns = new Map<HTMLElement, number>();

  let magnetic: HTMLElement | null = null;
  let tilt: HTMLElement | null = null;
  let pointerX = 0;
  let pointerY = 0;
  let ringX = 0;
  let ringY = 0;
  let frame = 0;
  let visible = false;

  const clearInline = (el: HTMLElement): void => {
    el.style.transform = '';
    el.style.transition = '';
    el.style.willChange = '';
  };

  const engage = (el: HTMLElement): void => {
    const pending = returns.get(el);
    if (pending !== undefined) {
      clearTimeout(pending);
      returns.delete(el);
    }
    // El loop escribe transform cada frame: una transición sobre `transform`
    // en el medio lo frenaría. Se saca SÓLO `transform` de la lista animada,
    // no la transición entera: si no, el hover del riel y del botón primario
    // perderían su cambio de color y el feedback se apagaría en seco.
    // Es una lectura de estilo en el `pointerover`, no por frame.
    const properties = getComputedStyle(el).transitionProperty;
    if (properties && properties !== 'none') {
      const kept = properties
        .split(',')
        .map((property) => property.trim())
        .filter((property) => property && property !== 'transform' && property !== 'all');
      el.style.transitionProperty = kept.length ? kept.join(', ') : 'none';
    }
    el.style.willChange = 'transform';
  };

  const release = (el: HTMLElement): void => {
    if (!el.isConnected) {
      clearInline(el);
      return;
    }
    el.style.transition = `transform var(--t-micro) var(--ease)`;
    el.style.transform = '';
    const timer = window.setTimeout(() => {
      el.style.transition = '';
      el.style.willChange = '';
      returns.delete(el);
    }, RETURN_MS);
    returns.set(el, timer);
  };

  const tick = (): void => {
    frame = 0;

    // Preferencia cambiada a mitad de sesión: se apaga sin esperar a un evento.
    if (prefersReducedMotion()) {
      stop();
      return;
    }

    ringX += (pointerX - ringX) * RING_LERP;
    ringY += (pointerY - ringY) * RING_LERP;
    ring.style.transform = `translate(${ringX.toFixed(2)}px, ${ringY.toFixed(2)}px)`;

    if (magnetic) {
      const rect = rects.get(magnetic);
      if (rect) {
        const dx = clamp((pointerX - (rect.left + rect.width / 2)) * MAGNET_RATIO, MAGNET_MAX);
        const dy = clamp((pointerY - (rect.top + rect.height / 2)) * MAGNET_RATIO, MAGNET_MAX);
        magnetic.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`;
      }
    }

    if (tilt) {
      const rect = rects.get(tilt);
      if (rect) {
        const nx = (pointerX - (rect.left + rect.width / 2)) / Math.max(1, rect.width / 2);
        const ny = (pointerY - (rect.top + rect.height / 2)) / Math.max(1, rect.height / 2);
        const rotX = -clamp(ny * TILT_MAX, TILT_MAX);
        const rotY = clamp(nx * TILT_MAX, TILT_MAX);
        tilt.style.transform =
          `perspective(${TILT_PERSPECTIVE}px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg)`;
      }
    }

    frame = requestAnimationFrame(tick);
  };

  const start = (): void => {
    if (frame || prefersReducedMotion()) return;
    if (!visible) {
      visible = true;
      ring.style.opacity = '1';
      ring.style.willChange = 'transform';
    }
    frame = requestAnimationFrame(tick);
  };

  const stop = (): void => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;

    if (magnetic) {
      release(magnetic);
      magnetic = null;
    }
    if (tilt) {
      release(tilt);
      tilt = null;
    }

    if (!visible) return;
    visible = false;
    ring.style.opacity = '0';
    ring.style.willChange = '';
  };

  /** Cache de geometría: una lectura por objetivo cuando el puntero lo engancha. */
  const onPointerOver = (event: PointerEvent): void => {
    const target = event.target instanceof Element ? event.target : null;
    const nextMagnetic = target ? target.closest<HTMLElement>(MAGNETIC) : null;
    const nextTilt = target ? target.closest<HTMLElement>(TILT) : null;

    if (nextMagnetic !== magnetic) {
      if (magnetic) release(magnetic);
      magnetic = nextMagnetic;
      if (magnetic) {
        rects.set(magnetic, magnetic.getBoundingClientRect());
        engage(magnetic);
      }
    }

    if (nextTilt !== tilt) {
      if (tilt) release(tilt);
      tilt = nextTilt;
      if (tilt) {
        rects.set(tilt, tilt.getBoundingClientRect());
        engage(tilt);
      }
    }
  };

  const onPointerMove = (event: PointerEvent): void => {
    pointerX = event.clientX;
    pointerY = event.clientY;

    if (!visible) {
      // Primera aparición: el anillo nace bajo el puntero, no vuela desde 0,0.
      ringX = pointerX;
      ringY = pointerY;
    }

    // La página puede haberse ido con el objetivo adentro: se suelta sin
    // animación de retorno (el nodo ya no está en el documento).
    if (magnetic && !magnetic.isConnected) magnetic = null;
    if (tilt && !tilt.isConnected) tilt = null;

    start();
  };

  /** Scroll/resize: la geometría cacheada es la única que puede haber quedado vieja. */
  const invalidate = (): void => {
    rects.clear();
    if (magnetic?.isConnected) rects.set(magnetic, magnetic.getBoundingClientRect());
    if (tilt?.isConnected) rects.set(tilt, tilt.getBoundingClientRect());
  };

  const onPointerLeave = (event: PointerEvent): void => {
    if (event.relatedTarget) return;
    stop();
  };
  const onVisibility = (): void => {
    if (document.hidden) stop();
  };

  const stopWatch = watchReducedMotion((reduce) => {
    if (reduce) stop();
  });

  document.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('pointerover', onPointerOver, { passive: true });
  document.addEventListener('pointerleave', onPointerLeave, { passive: true });
  // `pointerleave` no llega a document en todos los motores: `pointerout` sin
  // `relatedTarget` es la misma salida de la ventana y sí burbujea.
  document.addEventListener('pointerout', onPointerLeave, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  // Captura: también cuenta el scroll de `.main-content`, no sólo el de window.
  window.addEventListener('scroll', invalidate, { passive: true, capture: true });
  window.addEventListener('resize', invalidate, { passive: true });

  return () => {
    stopWatch();
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerover', onPointerOver);
    document.removeEventListener('pointerleave', onPointerLeave);
    document.removeEventListener('pointerout', onPointerLeave);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('scroll', invalidate, true);
    window.removeEventListener('resize', invalidate);

    if (frame) cancelAnimationFrame(frame);
    frame = 0;

    returns.forEach((timer) => clearTimeout(timer));
    returns.clear();
    rects.clear();

    if (magnetic) clearInline(magnetic);
    if (tilt) clearInline(tilt);
    magnetic = null;
    tilt = null;

    ring.remove();
  };
}
