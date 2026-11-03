import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';

import { Login } from './login';
import { AuthService } from '../../shared/services/auth.service';
import { TaskService } from '../../shared/services/task';

/**
 * Regression pin: the app runs zoneless, so state written from an RxJS
 * subscription must schedule change detection by itself. A failed login used to
 * leave the button spinning on "Cargando..." and hide the error until the user
 * typed in one of the fields.
 */
describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let component: Login;
  let loginCalls: { email: string; password: string }[];
  let reloads: number;

  function arrange(loginResult: Observable<boolean>): void {
    loginCalls = [];
    reloads = 0;

    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            login: (email: string, password: string) => {
              loginCalls.push({ email, password });
              return loginResult;
            },
          },
        },
        {
          provide: TaskService,
          useValue: {
            reloadForUser: () => {
              reloads += 1;
            },
          },
        },
      ],
    });

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
  }

  function buttonText(): string {
    return fixture.debugElement.query(By.css('button[type="submit"]')).nativeElement.textContent.trim();
  }

  function bodyText(): string {
    return fixture.nativeElement.textContent as string;
  }

  async function submit(email: string, password: string): Promise<void> {
    component.loginForm.setValue({ email, password });
    await fixture.whenStable();
    fixture.debugElement.query(By.css('button[type="submit"]')).nativeElement.click();
    await fixture.whenStable();
  }

  it('shows the invalid-credentials error right after a failed submit, without another interaction', async () => {
    arrange(of(false));

    await submit('usuario@correo.com', 'clave-larga');

    expect(loginCalls).toEqual([{ email: 'usuario@correo.com', password: 'clave-larga' }]);
    expect(buttonText()).toBe('Iniciar sesion');
    expect(bodyText()).toContain('Correo o contrasena incorrectos');
  });

  it('shows the connection error right after a rejected request, without another interaction', async () => {
    arrange(throwError(() => new Error('network')));

    await submit('usuario@correo.com', 'clave-larga');

    expect(buttonText()).toBe('Iniciar sesion');
    expect(bodyText()).toContain('Error al conectar. Intenta de nuevo.');
  });

  it('navigates to the dashboard and reloads tasks on a successful login', async () => {
    arrange(of(true));
    const router = TestBed.inject(Router);
    const navigations: string[] = [];
    router.navigate = ((commands: string[]) => {
      navigations.push(commands.join('/'));
      return Promise.resolve(true);
    }) as Router['navigate'];

    await submit('usuario@correo.com', 'clave-larga');

    expect(reloads).toBe(1);
    expect(navigations).toEqual(['/dashboard']);
  });
});
