/**
 * Hero del panel de identidad (login / signup).
 *
 * WebGL2 crudo, un solo full-screen pass. three.js costaría ~160KB comprimidos
 * para exactamente esta escena: un plano y un fragment shader. Acá son ~6KB y
 * cero dependencias.
 *
 * Presupuesto y degradación:
 *  - Sin loop autónomo. El campo se asienta durante la entrada (1.2s) y se
 *    detiene: no hay motion automático >5s, así que no hace falta control de
 *    pausa (WCAG 2.2.2). Después sólo responde al puntero, que es
 *    interacción-triggered y cae con la rama de reducción de movimiento.
 *  - Escalera de calidad medida: si el frame promedio durante el asentamiento
 *    pasa de 12ms, baja el DPR un escalón y vuelve a medir.
 *  - Sin WebGL2 o con contexto perdido, el componente no dibuja nada y queda
 *    el fondo del panel (.auth-hero__poster): un degradé estático en CSS.
 *  - Pestaña oculta: se detiene.
 */

const VERT = `#version 300 es
in vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;

uniform vec2 u_res;
uniform vec2 u_ptr;
uniform float u_settle;

out vec4 outColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p = uv * vec2(u_res.x / max(u_res.y, 1.0), 1.0) * 1.6;

  // Warp de dominio: dos campos de ruido desplazan el tercero. Es lo que
  // convierte ruido en corriente de tinta en vez de nubes.
  vec2 q = vec2(fbm(p + u_ptr * 0.35), fbm(p + vec2(5.2, 1.3)));
  float f = fbm(p + q * 1.8 + u_ptr * 0.2);

  vec3 ink = vec3(0.078, 0.086, 0.090);      // --s1
  vec3 accent = vec3(0.878, 0.694, 0.333);   // --e0b155

  // El acento vive sólo en las crestas: no es un degradé de color.
  float crest = smoothstep(0.50, 0.80, f);
  vec3 col = mix(ink, accent, crest * 0.13 * u_settle);

  // Viñeta: el canvas no tiene borde, se disuelve en el panel.
  float vig = smoothstep(0.0, 0.55, min(uv.x, 1.0 - uv.x))
            * smoothstep(0.0, 0.45, min(uv.y, 1.0 - uv.y));
  col = mix(ink, col, vig);

  // Grano fino: mata el banding del degradé en OLED.
  col += (hash(gl_FragCoord.xy) - 0.5) * 0.012;

  outColor = vec4(col, 1.0);
}`;

/** DPR por escalón: la escalera baja, nunca sube (evita oscilar). */
const DPR_STEPS = [2, 1.5, 1];
const SETTLE_MS = 1200;
const FRAME_BUDGET_MS = 12;

export class InkHero {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly uRes: WebGLUniformLocation | null;
  private readonly uPtr: WebGLUniformLocation | null;
  private readonly uSettle: WebGLUniformLocation | null;

  private dprStep = 0;
  private frame = 0;
  private settleStart = 0;
  private lastFrameAt = 0;
  private frameCosts: number[] = [];

  // Puntero objetivo y actual (lerp). Se escribe una vez por frame.
  private pointerTarget: [number, number] = [0, 0];
  private pointer: [number, number] = [0, 0];
  private pointerBurstUntil = 0;

  private resizeObserver?: ResizeObserver;
  private destroyed = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
      preserveDrawingBuffer: false,
    });
    if (!gl) throw new Error('webgl2 unavailable');
    this.gl = gl;

    this.program = this.link(VERT, FRAG);
    gl.useProgram(this.program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(this.program, 'a_pos');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    this.uRes = gl.getUniformLocation(this.program, 'u_res');
    this.uPtr = gl.getUniformLocation(this.program, 'u_ptr');
    this.uSettle = gl.getUniformLocation(this.program, 'u_settle');

    gl.uniform1f(this.uSettle, 0);

    canvas.addEventListener('webglcontextlost', this.onContextLost, false);
    document.addEventListener('visibilitychange', this.onVisibility);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(canvas);
    }

    this.resize();
    this.settle();
  }

  /** Un frame. Escribe el tamaño y el puntero suavizado. */
  private draw(settle: number): void {
    const { gl } = this;
    gl.uniform2f(this.uRes, this.pxWidth, this.pxHeight);
    gl.uniform2f(this.uPtr, this.pointer[0], this.pointer[1]);
    gl.uniform1f(this.uSettle, settle);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private pxWidth = 1;
  private pxHeight = 1;

  private resize(): void {
    if (this.destroyed) return;
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const dpr = Math.min(window.devicePixelRatio || 1, DPR_STEPS[this.dprStep]);
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (w === this.pxWidth && h === this.pxHeight) return;

    this.pxWidth = w;
    this.pxHeight = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this.gl.viewport(0, 0, w, h);
    this.draw(1);
  }

  /**
   * Asentamiento de entrada: 1.2s de rAF, y después el loop se apaga.
   * Mientras corre mide el costo de frame para la escalera de calidad.
   */
  private settle(): void {
    if (this.destroyed) return;
    this.settleStart = performance.now();
    this.lastFrameAt = this.settleStart;
    this.frameCosts = [];

    const step = (now: number) => {
      if (this.destroyed) return;

      const t = Math.min(1, (now - this.settleStart) / SETTLE_MS);
      const eased = 1 - Math.pow(1 - t, 3);

      const delta = now - this.lastFrameAt;
      this.lastFrameAt = now;
      if (delta > 0 && delta < 200) this.frameCosts.push(delta);

      this.draw(eased);

      if (t < 1) {
        this.frame = requestAnimationFrame(step);
        return;
      }

      this.measureQuality();
      this.frame = 0;
      // Última pasada sin loop: el campo queda quieto hasta que el puntero lo toque.
      this.draw(1);
    };

    this.frame = requestAnimationFrame(step);
  }

  /** Si el frame promedio se pasó del presupuesto, baja un escalón de DPR. */
  private measureQuality(): void {
    if (this.frameCosts.length < 20) return;
    const avg = this.frameCosts.reduce((a, b) => a + b, 0) / this.frameCosts.length;
    if (avg <= FRAME_BUDGET_MS || this.dprStep >= DPR_STEPS.length - 1) return;

    this.dprStep += 1;
    this.pxWidth = 0;
    this.pxHeight = 0;
    this.resize();
  }

  /** Puntero: interacción-triggered, con una ráfaga corta de lerp. */
  onPointerMove(clientX: number, clientY: number): void {
    if (this.destroyed) return;
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    this.pointerTarget = [
      ((clientX - rect.left) / rect.width) * 2 - 1,
      1 - ((clientY - rect.top) / rect.height) * 2,
    ];

    if (this.frame) return;
    this.pointerBurstUntil = performance.now() + 480;

    const burst = (now: number) => {
      if (this.destroyed) return;
      for (let i = 0; i < 2; i++) {
        this.pointer[i] += (this.pointerTarget[i] - this.pointer[i]) * 0.14;
      }
      this.draw(1);
      if (now < this.pointerBurstUntil) {
        this.frame = requestAnimationFrame(burst);
      } else {
        this.frame = 0;
      }
    };
    this.frame = requestAnimationFrame(burst);
  }

  private readonly onContextLost = (event: Event) => {
    event.preventDefault();
    this.stop();
  };

  private readonly onVisibility = () => {
    if (document.hidden) this.stop();
  };

  private stop(): void {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  destroy(): void {
    this.destroyed = true;
    this.stop();
    this.resizeObserver?.disconnect();
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
    document.removeEventListener('visibilitychange', this.onVisibility);
    const { gl } = this;
    gl.useProgram(null);
    gl.deleteProgram(this.program);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }

  private link(vertexSrc: string, fragmentSrc: string): WebGLProgram {
    const { gl } = this;
    const program = gl.createProgram();
    if (!program) throw new Error('program');

    for (const [type, src] of [
      [gl.VERTEX_SHADER, vertexSrc],
      [gl.FRAGMENT_SHADER, fragmentSrc],
    ] as const) {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('shader');
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader) ?? 'shader compile failed');
      }
      gl.attachShader(program, shader);
    }

    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? 'link failed');
    }
    return program;
  }
}
