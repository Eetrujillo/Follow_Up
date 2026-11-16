import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';
import { TaskService } from '../../shared/services/task';
import { LibraryService } from '../../shared/services/library';

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
  /* Zoneless: a plain field mutated inside an RxJS callback never schedules a
     repaint, and the error box only appeared after another user gesture. */
  errorMessage = signal('');
  successMessage = signal('');
  isLoading = signal(false);

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private taskService: TaskService,
    private libraryService: LibraryService,
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
        // Write into the existing signal: replacing the instance would leave the
        // view bound to the old one.
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
          // Every cached collection is keyed by user: reloading here is what keeps
          // the previous account's documents off the screen after a session change.
          this.libraryService.reloadForUser();
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
