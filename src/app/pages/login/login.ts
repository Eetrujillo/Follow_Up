import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';
import { TaskService } from '../../shared/services/task';

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
  errorMessage = '';
  successMessage = '';
  isLoading = false;

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
        this.successMessage = 'Cuenta creada. Ahora inicia sesion.';
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
    this.errorMessage = '';
    this.successMessage = '';

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
          this.errorMessage = 'Correo o contrasena incorrectos';
        }
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Error al conectar. Intenta de nuevo.';
      },
    });
  }
}
