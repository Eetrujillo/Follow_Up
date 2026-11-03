import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';
import { TaskService } from '../../shared/services/task';

/**
 * The application runs zoneless, so every piece of state written from an async
 * callback is a signal: mutating a plain field there would not schedule change
 * detection and the view would keep showing "Cargando...".
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  loginForm: FormGroup;
  verPassword = false;
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly isLoading = signal(false);

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private taskService: TaskService,
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  ngOnInit() {
    // Mostrar mensaje si viene del registro
    this.route.queryParams.subscribe((params) => {
      if (params['registered']) {
        this.successMessage.set('Cuenta creada. Ahora inicia sesion.');
      }
    });
  }

  get email() {
    return this.loginForm.get('email');
  }
  get password() {
    return this.loginForm.get('password');
  }

  toggleOjo() {
    this.verPassword = !this.verPassword;
  }

  onSubmit() {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.loginForm.value;
    this.isLoading.set(true);

    this.authService.login(email, password).subscribe({
      next: (success) => {
        this.isLoading.set(false);
        if (success) {
          this.taskService.reloadForUser();
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage.set('Correo o contrasena incorrectos');
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Error al conectar. Intenta de nuevo.');
      },
    });
  }
}
