import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthApiService } from '../../shared/services/auth-api.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './signup.html',
  styleUrl: './signup.css',
})
/**
 * The application runs zoneless, so every piece of state written from an async
 * callback is a signal; a plain field would leave the button spinning on
 * "Registrando...".
 */
export class Signup {
  signupForm: FormGroup;
  readonly errorMessage = signal('');
  readonly isLoading = signal(false);

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authApi: AuthApiService,
  ) {
    this.signupForm = this.fb.group(
      {
        name: ['', [Validators.required, Validators.minLength(2)]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirm: ['', [Validators.required]],
      },
      { validators: this.passwordsMatch },
    );
  }

  passwordsMatch(group: FormGroup) {
    const pass = group.get('password')?.value;
    const confirm = group.get('confirm')?.value;
    return pass === confirm ? null : { noMatch: true };
  }

  get name() {
    return this.signupForm.get('name');
  }
  get email() {
    return this.signupForm.get('email');
  }
  get password() {
    return this.signupForm.get('password');
  }
  get confirm() {
    return this.signupForm.get('confirm');
  }

  onSubmit() {
    this.errorMessage.set('');

    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }

    const { name, email, password } = this.signupForm.value;
    this.isLoading.set(true);

    this.authApi.register({ fullName: name, email, password }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/login'], {
          queryParams: { registered: 'true' },
        });
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.message || 'Error al registrar');
      },
    });
  }
}
