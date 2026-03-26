import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { UserService } from '../../shared/services/user';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  loginForm: FormGroup;
  errorMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private userService: UserService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  onSubmit() {
    this.errorMessage = '';

    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      const user = this.userService.authenticateUser(email, password);

      if (user) {
        this.router.navigate(['/dashboard']);
      } else {
        this.errorMessage = 'Credenciales incorrectas. Verifica tu email y contraseña.';
      }
    } else {
      this.loginForm.markAllAsTouched();
    }
  }
}
