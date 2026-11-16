import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { Signup } from './signup';
import { AuthApiService } from '../../shared/services/auth-api.service';

describe('Signup', () => {
  let component: Signup;
  let fixture: ComponentFixture<Signup>;
  let el: HTMLElement;
  let registerCalls: Array<{ fullName: string; email: string; password: string }>;

  beforeEach(async () => {
    registerCalls = [];
    const apiStub = {
      register: (payload: { fullName: string; email: string; password: string }) => {
        registerCalls.push(payload);
        return of({});
      },
    };

    await TestBed.configureTestingModule({
      imports: [Signup],
      providers: [provideRouter([{ path: 'login', children: [] }]), { provide: AuthApiService, useValue: apiStub }],
    }).compileComponents();

    fixture = TestBed.createComponent(Signup);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('el submit lleva clase explícita btn--primary, no se estiliza por un selector genérico button', () => {
    const btn = el.querySelector<HTMLButtonElement>('form button[type="submit"]');
    expect(btn).toBeTruthy();
    expect(btn!.classList.contains('btn')).toBe(true);
    expect(btn!.classList.contains('btn--primary')).toBe(true);
    expect(btn!.textContent).toContain('Crear cuenta');
  });

  it('el submit conserva [disabled]="isLoading" y muestra spinner + aria-busy al registrar', async () => {
    const btn = el.querySelector<HTMLButtonElement>('form button[type="submit"]');
    expect(btn!.disabled).toBe(false);

    component.isLoading.set(true);
    fixture.changeDetectorRef.markForCheck();
    await fixture.whenStable();

    expect(btn!.disabled).toBe(true);
    expect(btn!.getAttribute('aria-busy')).toBe('true');
    expect(btn!.querySelector('.spinner')).toBeTruthy();
    expect(btn!.textContent).toContain('Registrando...');
  });

  it('mantiene register() con fullName/email/password y redirige a /login con ?registered', async () => {
    const router = TestBed.inject(Router);
    component.signupForm.setValue({
      name: 'Ana Prueba',
      email: 'ana@test.com',
      password: '12345678',
      confirm: '12345678',
    });

    const btn = el.querySelector<HTMLButtonElement>('form button[type="submit"]');
    btn!.click();
    // La navegación del router es asíncrona: se asienta con whenStable antes de leer router.url.
    await fixture.whenStable();

    expect(registerCalls).toEqual([
      { fullName: 'Ana Prueba', email: 'ana@test.com', password: '12345678' },
    ]);
    expect(component.isLoading()).toBe(false);
    expect(router.url).toContain('/login');
    expect(router.url).toContain('registered=true');
  });

  it('Inicia sesion es un a[routerLink] real', () => {
    const link = el.querySelector<HTMLAnchorElement>('a[routerLink="/login"]');
    expect(link?.tagName).toBe('A');
    expect(link?.textContent).toContain('Inicia sesion');
  });

  it('mantiene la validación de contraseñas que no coinciden', () => {
    component.signupForm.setValue({
      name: 'Ana Prueba',
      email: 'ana@test.com',
      password: '12345678',
      confirm: '87654321',
    });
    const btn = el.querySelector<HTMLButtonElement>('form button[type="submit"]');
    btn!.click();
    fixture.detectChanges();

    expect(registerCalls.length).toBe(0);
    const errores = Array.from(el.querySelectorAll('.error')).map((n) => n.textContent!.trim());
    expect(errores).toContain('Las contrasenas no coinciden');
  });
});
