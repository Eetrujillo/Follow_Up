/**
 * Capa de movimiento compartida.
 *
 * Contrato aprobado en `odd/tasks/motion-redesign.md`. Este archivo es el único
 * lugar donde se decide *cuándo* se mueve algo; el *cuánto* vive en los tokens
 * de `styles.css` y ningún componente declara duraciones ni curvas propias.
 *
 * Reglas que hace cumplir:
 *  - El estado oculto lo habilita JS (`data-motion="on"`), nunca el CSS solo:
 *    si el script no corre, la página se lee completa.
 *  - Las lecturas de geometría se agrupan antes que las escrituras. Nunca se
 *    intercala `getBoundingClientRect` con `style.*` por elemento.
 *  - `prefers-reduced-motion` se evalúa al arrancar y se vuelve a evaluar en
 *    vivo, no una sola vez.
 */

const REDUCE_QUERY = '(prefers-reduced-motion: reduce)';
const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';
const COARSE_QUERY = '(hover: none)';

function matches(query: string): boolean {
  return typeof matchMedia === 'function' && matchMedia(query).matches;
}

export function prefersReducedMotion(): boolean {
  return matches(REDUCE_QUERY);
}

/** Puntero fino: habilita cursor magnético y tilt. Teclado nunca depende de esto. */
export function prefersFinePointer(): boolean {
  return matches(FINE_POINTER_QUERY) && !matches(COARSE_QUERY);
}

export function isCompactViewport(): boolean {
  return matches('(max-width: 860px)');
}

/**
 * Re-evalúa la preferencia en vivo. Devuelve el teardown.
 * Un usuario que la cambia a mitad de sesión no recarga la app.
 */
export function watchReducedMotion(onChange: (reduce: boolean) => void): () => void {
  if (typeof matchMedia !== 'function') return () => {};
  const mq = matchMedia(REDUCE_QUERY);
  const handler = () => onChange(mq.matches);
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}

/** Duración efectiva: cero bajo reducción de movimiento. */
export function duration(ms: number): number {
  return prefersReducedMotion() ? 0 : ms;
}

/**
 * Habilita la capa de movimiento sobre el contenedor de la app.
 * Se llama recién cuando el componente está montado, así que un script que no
 * corre deja el marcado en su estado visible por defecto.
 */
export function bootMotion(root: HTMLElement): () => void {
  root.dataset['motion'] = 'on';
  return () => {
    delete root.dataset['motion'];
  };
}

/**
 * Un solo IntersectionObserver para toda la app. Lo que entra en vista recibe
 * `.is-in` una vez y se deja de observar: nada se vuelve a animar al scrollear.
 *
 * Es re-entrante a propósito: las pantallas que pintan después de una respuesta
 * del backend lo vuelven a llamar y los objetivos nuevos se observan solos.
 */
export function observeReveals(
  root: ParentNode = document,
  { threshold = 0.12 }: { threshold?: number } = {},
): () => void {
  const targets = Array.from(
    root.querySelectorAll<HTMLElement>('.m-reveal:not(.is-in), .m-stagger:not(.is-in), .m-mask:not(.is-in)'),
  );
  if (!targets.length) return () => {};

  // Sin movimiento no hay nada que observar: todo nace en su estado final.
  if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
    targets.forEach((el) => el.classList.add('is-in'));
    return () => {};
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        el.classList.add('is-in');
        io.unobserve(el);
      }
    },
    { threshold, rootMargin: '0px 0px -6% 0px' },
  );

  targets.forEach((el) => io.observe(el));
  return () => io.disconnect();
}

/**
 * FLIP: mide, muta, mide, escribe. Ese orden es el punto entero.
 *
 * `getBoundingClientRect` se lee en un lote por estado (antes y después), nunca
 * intercalado con escrituras: el único flush forzado es el `offsetHeight` que
 * separa el estado invertido del estado final, y ocurre una vez por operación.
 */
export function flip(
  container: HTMLElement,
  mutate: () => void,
  { durationMs = 260 }: { durationMs?: number } = {},
): void {
  const items = Array.from(container.children) as HTMLElement[];
  if (!items.length || prefersReducedMotion()) {
    mutate();
    return;
  }

  const before = items.map((el) => el.getBoundingClientRect());

  mutate();

  const after = items.map((el) => el.getBoundingClientRect());

  const moved: HTMLElement[] = [];
  items.forEach((el, i) => {
    const dx = before[i].left - after[i].left;
    const dy = before[i].top - after[i].top;
    if (!dx && !dy) return;
    el.style.transition = 'none';
    el.style.transform = `translate(${dx}px, ${dy}px)`;
    moved.push(el);
  });

  if (!moved.length) return;

  // Único flush: el navegador tiene que ver el estado invertido antes de soltarlo.
  void container.offsetHeight;

  moved.forEach((el) => {
    el.style.transition = `transform ${durationMs}ms var(--ease)`;
    el.style.transform = '';
  });

  window.setTimeout(() => {
    moved.forEach((el) => {
      el.style.transition = '';
      el.style.transform = '';
    });
  }, durationMs + 60);
}

/**
 * Ventana de `will-change`: se aplica 200ms antes y se retira después.
 * Nunca queda puesto sobre un elemento permanente.
 */
export function withWillChange(elements: HTMLElement[], ms = 200): void {
  let timer = 0;
  const clear = () => {
    window.clearTimeout(timer);
    elements.forEach((el) => (el.style.willChange = ''));
  };
  timer = window.setTimeout(clear, ms);
  elements.forEach((el) => (el.style.willChange = 'transform'));
}

/** Lleva un número de 0 a `to` escribiendo texto, sin reflow (ancho reservado). */
export function countUp(el: HTMLElement, to: number, ms = 900): () => void {
  if (prefersReducedMotion() || ms <= 0) {
    el.textContent = String(Math.round(to));
    return () => {};
  }

  const start = performance.now();
  let frame = 0;
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / ms);
    // Misma curva que el token de asentamiento, muestreada.
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = String(Math.round(to * eased));
    if (t < 1) frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);

  return () => cancelAnimationFrame(frame);
}
