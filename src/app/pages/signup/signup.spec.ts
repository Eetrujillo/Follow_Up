import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';

import { Signup } from './signup';
import { AuthApiService } from '../../shared/services/auth-api.service';

/**
 * Same regression pin as the login page: zoneless state must refresh the view
 * after a rejected registration, without the user touching another field.
 */
describe('Signup', () => {
  let fixture: ComponentFixture<Signup>;
  let component: Signup;
  let registrations: { fullName: string; email: string; password: string }[];

  function arrange(registerResult: Observable<unknown>): void {
    registrations = [];

    TestBed.configureTestingModule({
      imports: [Signup],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: AuthApiService,
          useValue: {
            register: (request: { fullName: string; email: string; password: string }) => {
              registrations.push(request);
              return registerResult;
            },
            login: () => of({ access_token: 'token', token_type: 'Bearer', expires_in: 3600 }),
            me: () => of({}),
            getAccessToken: () => null,
            logout: () => undefined,
          },
        },
      ],
    });

    fixture = TestBed.createComponent(Signup);
    component = fixture.componentInstance;
  }

  function buttonText(): string {
    return fixture.debugElement.query(By.css('button[type="submit"]')).nativeElement.textContent.trim();
  }

  async function submit(): Promise<void> {
    component.signupForm.setValue({
      name: 'Ana Torres',
      email: 'ana@correo.com',
      password: 'clave-larga',
      confirm: 'clave-larga',
    });
    await fixture.whenStable();
    fixture.debugElement.query(By.css('button[type="submit"]')).nativeElement.click();
    await fixture.whenStable();
  }

  it('shows the registration error right after a rejected submit, without another interaction', async () => {
    arrange(throwError(() => new Error('El correo ya esta registrado')));

    await submit();

    expect(registrations).toEqual([{ fullName: 'Ana Torres', email: 'ana@correo.com', password: 'clave-larga' }]);
    expect(buttonText()).toBe('Crear cuenta');
    expect(fixture.nativeElement.textContent).toContain('El correo ya esta registrado');
  });

  it('navigates to the login page with the registered flag on success', async () => {
    arrange(of({ user: { id: 'uuid' }, token: 'jwt' }));
    const router = TestBed.inject(Router);
    const navigations: string[] = [];
    router.navigate = ((commands: string[]) => {
      navigations.push(commands.join('/'));
      return Promise.resolve(true);
    }) as Router['navigate'];

    await submit();

    expect(navigations).toEqual(['/login']);
  });
});
