import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { TaskService } from '../../shared/services/task';
import { AuthService } from '../../shared/services/auth.service';
import { ChangeDetectorRef } from '@angular/core';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

  loginForm: FormGroup;
  verPassword  = false;
  errorMessage = '';
  isLoading    = false;

  constructor(
    private fb:          FormBuilder,
    private router:      Router,
    private authService: AuthService,
    private taskService: TaskService,
    private cdRef: ChangeDetectorRef

  ) {
    this.loginForm = this.fb.group({
      email: [
        '',
        [Validators.required, Validators.email]
      ],
      password: [
        '',
        [Validators.required, Validators.minLength(8)]
      ]
    });
  }

  get email()    { return this.loginForm.get('email');    }
  get password() { return this.loginForm.get('password'); }

  toggleOjo() {
    this.verPassword = !this.verPassword;
  }

  onSubmit() {
    this.errorMessage = '';

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.loginForm.value;
    this.isLoading = true;

    this.authService.login(email, password).subscribe({
      next: (success) => {
        this.isLoading = false;
        if (success) {
          this.taskService.reloadForUser();
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage = 'Correo o contraseña incorrectos';
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.message || 'Error al iniciar sesion';
        this.cdRef.detectChanges();

      }
    });
  }
}