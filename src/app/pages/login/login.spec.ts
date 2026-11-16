import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { Login } from './login';
import { AuthService } from '../../shared/services/auth.service';
import { TaskService } from '../../shared/services/task';
import { LibraryService } from '../../shared/services/library';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let el: HTMLElement;
  let loginCalls: Array<{ email: string; password: string }>;
  let loginReturn: Array<boolean>;

  beforeEach(async () => {
    loginCalls = [];
    loginReturn = [false];
    const authStub = {
      login: (email: string, password: string) => {
        loginCalls.push({ email, password });
        return of(loginReturn[0]);
      },
    };

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authStub },
        { provide: TaskService, useValue: { reloadForUser: () => {} } },
        { provide: LibraryService, useValue: { reloadForUser: () => {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('el ojo es un button con aria-label dinámico y aria-pressed, y sigue llamando toggleOjo()', () => {
    const ojo = el.querySelector<HTMLButtonElement>('.ojo');
    expect(ojo).toBeTruthy();
    expect(ojo!.tagName).toBe('BUTTON');
    expect(ojo!.getAttribute('type')).toBe('button');
    expect(ojo!.getAttribute('aria-label')).toBe('Mostrar contraseña');
    expect(ojo!.getAttribute('aria-pressed')).toBe('false');
    expect(ojo!.querySelector('svg')).toBeTruthy();

    const input = el.querySelector<HTMLInputElement>('.password-wrapper input');
    expect(input?.type).toBe('password');

    ojo!.click();
    fixture.detectChanges();

    expect(component.verPassword).toBe(true);
    expect(input?.type).toBe('text');
    expect(ojo!.getAttribute('aria-label')).toBe('Ocultar contraseña');
    expect(ojo!.getAttribute('aria-pressed')).toBe('true');
    expect(ojo!.querySelector('svg')).toBeTruthy();
  });

  it('el submit conserva [disabled]="isLoading" y muestra spinner + aria-busy al cargar', async () => {
    const btn = el.querySelector<HTMLButtonElement>('form button[type="submit"]');
    expect(btn).toBeTruthy();
    expect(btn!.textContent).toContain('Iniciar sesion');
    expect(btn!.disabled).toBe(false);

    component.isLoading = true;
    fixture.changeDetectorRef.markForCheck();
    await fixture.whenStable();

    expect(btn!.disabled).toBe(true);
    expect(btn!.getAttribute('aria-busy')).toBe('true');
    expect(btn!.querySelector('.spinner')).toBeTruthy();
    expect(btn!.textContent).toContain('Cargando...');
  });

  it('Registrate es un a[routerLink] real, no un span', () => {
    const link = el.querySelector<HTMLAnchorElement>('a[routerLink="/signup"]');
    expect(link?.tagName).toBe('A');
    expect(link?.textContent).toContain('Registrate');
  });

  it('mantiene la validación: submit inválido no llama al servicio y muestra errores de campo', () => {
    const btn = el.querySelector<HTMLButtonElement>('form button[type="submit"]');
    btn!.click();
    fixture.detectChanges();

    expect(loginCalls.length).toBe(0);
    const errores = Array.from(el.querySelectorAll('.error')).map((n) => n.textContent!.trim());
    expect(errores).toContain('El correo es obligatorio');
    expect(errores).toContain('La contraseña es obligatoria');
  });

  it('mantiene login() con los valores del formulario y el error de credenciales sobre .error-box', () => {
    component.loginForm.setValue({ email: 'ana@test.com', password: '12345678' });
    const btn = el.querySelector<HTMLButtonElement>('form button[type="submit"]');
    btn!.click();
    fixture.detectChanges();

    expect(loginCalls).toEqual([{ email: 'ana@test.com', password: '12345678' }]);
    expect(component.errorMessage).toBe('Correo o contrasena incorrectos');
    const box = el.querySelector('.error-box');
    expect(box?.textContent).toContain('Correo o contrasena incorrectos');
  });
});
