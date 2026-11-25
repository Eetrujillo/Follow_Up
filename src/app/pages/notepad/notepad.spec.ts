import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Notepad } from './notepad';

describe('Notepad', () => {
  let component: Notepad;
  let fixture: ComponentFixture<Notepad>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Notepad]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Notepad);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    await render();
  });

  // En zoneless, cada mutación de estado se asienta con markForCheck + whenStable:
  // un detectChanges() sincrónico dispara NG0100 cuando la mutación ocurre fuera del ciclo.
  async function render() {
    fixture.changeDetectorRef.markForCheck();
    await fixture.whenStable();
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('deshabilita Guardar en Biblioteca sin contenido (comportamiento previo)', () => {
    const saveBtn = el.querySelector<HTMLButtonElement>('.header-actions button');
    expect(saveBtn).toBeTruthy();
    expect(saveBtn!.disabled).toBe(true);
    expect(saveBtn!.textContent).toContain('Guardar en Biblioteca');
  });

  describe('barra de herramientas de formato', () => {
    it('renderiza negrita, cursiva y subrayado conectados a format() e isActive()', () => {
      const tools = Array.from(el.querySelectorAll<HTMLButtonElement>('.tool-btn'));
      expect(tools.length).toBe(3);
      expect(tools[0].getAttribute('aria-label')).toBe('Negrita');
      expect(tools[1].getAttribute('aria-label')).toBe('Cursiva');
      expect(tools[2].getAttribute('aria-label')).toBe('Subrayado');
      // aria-pressed refleja isActive() (false en jsdom, true en navegador real)
      expect(tools.map(t => t.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'false']);
      // cada botón lleva un icono SVG inline, no un glifo
      for (const t of tools) {
        expect(t.querySelector('svg')).toBeTruthy();
        expect(t.textContent!.trim()).toBe('');
      }
    });

    it('llama a format("bold"|"italic"|"underline") al hacer clic', () => {
      const executed: string[] = [];
      (document as any).execCommand = (cmd: string) => {
        executed.push(cmd);
        return true;
      };
      const tools = Array.from(el.querySelectorAll<HTMLButtonElement>('.tool-btn'));
      tools[0].click();
      tools[1].click();
      tools[2].click();
      expect(executed).toEqual(['bold', 'italic', 'underline']);
    });
  });

  describe('mensajes de IA', () => {
    it('renderiza el error de IA sin estilo inline', async () => {
      component.generateError = 'No se pudo conectar con la IA.';
      await render();
      const msg = el.querySelector('.ai-message');
      expect(msg?.textContent).toContain(component.generateError);
      expect(msg?.hasAttribute('style')).toBe(false);
    });

    it('renderiza aiSuccessMessage (antes se asignaba y nunca se mostraba)', async () => {
      component.aiSuccessMessage = 'Tareas sugeridas añadidas al final de la nota.';
      await render();
      const ok = el.querySelector('.ai-message--ok');
      expect(ok?.textContent).toContain(component.aiSuccessMessage);
    });
  });

  describe('botón Crear tareas con IA', () => {
    it('mantiene el handler y muestra spinner + aria-busy mientras genera', async () => {
      const btn = el.querySelector<HTMLButtonElement>('.ai-actions button');
      expect(btn?.textContent).toContain('Crear tareas con IA');

      component.generating = true;
      await render();
      expect(btn?.disabled).toBe(true);
      expect(btn?.getAttribute('aria-busy')).toBe('true');
      expect(btn?.querySelector('.spinner')).toBeTruthy();
      expect(btn?.textContent).toContain('Generando...');
    });
  });

  describe('modal de guardado', () => {
    function openModal() {
      component.openSaveModal();
    }

    it('es un dialog con aria-modal y enfoca el input al abrir', async () => {
      openModal();
      await render();
      const dialog = el.querySelector('[role="dialog"]');
      expect(dialog).toBeTruthy();
      expect(dialog!.getAttribute('aria-modal')).toBe('true');
      await new Promise(r => setTimeout(r, 0));
      expect(document.activeElement).toBe(el.querySelector<HTMLInputElement>('.modal input'));
    });

    it('cierra con Esc', async () => {
      openModal();
      await render();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await render();
      expect(component.showSaveModal).toBe(false);
      expect(el.querySelector('[role="dialog"]')).toBeNull();
    });

    it('cierra por clic en el overlay pero no por clic dentro del modal', async () => {
      openModal();
      await render();
      const overlay = el.querySelector<HTMLElement>('.modal-overlay')!;
      const modal = el.querySelector<HTMLElement>('.modal')!;
      modal.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await render();
      expect(component.showSaveModal).toBe(true);
      overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await render();
      expect(component.showSaveModal).toBe(false);
    });

    it('conserva Cancelar, Guardar y Enter en el input', async () => {
      const saved: string[] = [];
      (component as any).libraryService.saveNote = (name: string) => {
        saved.push(name);
      };
      openModal();
      await render();
      let input = el.querySelector<HTMLInputElement>('.modal input');
      expect(input!.placeholder).toBe('Nombre de la nota');
      input!.value = 'Mi nota';
      input!.dispatchEvent(new Event('input'));
      await render();
      input!.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
      await new Promise(r => setTimeout(r, 0));
      expect(saved).toEqual(['Mi nota']);
      expect(component.showSaveModal).toBe(false);

      // openSaveModal limpia noteName: la app pide escribir el nombre antes de cada guardado.
      component.openSaveModal();
      await render();
      input = el.querySelector<HTMLInputElement>('.modal input')!;
      input.value = 'Mi nota';
      input.dispatchEvent(new Event('input'));
      await render();
      el.querySelector<HTMLButtonElement>('.modal .btn--quiet')!.click();
      await render();
      expect(component.showSaveModal).toBe(false);

      component.openSaveModal();
      await render();
      input = el.querySelector<HTMLInputElement>('.modal input')!;
      input.value = 'Mi nota';
      input.dispatchEvent(new Event('input'));
      await render();
      el.querySelectorAll<HTMLButtonElement>('.modal-actions .btn')[1]!.click();
      await new Promise(r => setTimeout(r, 0));
      expect(saved).toEqual(['Mi nota', 'Mi nota']);
      expect(component.showSaveModal).toBe(false);
    });
  });
});
