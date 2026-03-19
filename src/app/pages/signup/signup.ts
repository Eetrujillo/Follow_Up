import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './signup.html',
  styleUrl: './signup.css'
})
export class Signup {

  name     = '';
  email    = '';
  password = '';
  confirm  = '';

  submitted = false;
  errors = {
    name: '',
    email: '',
    password: '',
    confirm: ''
  };

  constructor(private router: Router) {}

  private clearErrors() {
    this.errors = {
      name: '',
      email: '',
      password: '',
      confirm: ''
    };
  }

  clearError(field: keyof typeof this.errors) {
    this.errors[field] = '';
  }

  private validate(): boolean {
    this.clearErrors();

    if (!this.name.trim()) {
      this.errors.name = 'El nombre es obligatorio.';
    }

    if (!this.email.trim()) {
      this.errors.email = 'El correo es obligatorio.';
    } else if (!this.email.includes('@')) {
      this.errors.email = 'El correo debe contener @.';
    }

    if (!this.password) {
      this.errors.password = 'La contraseña es obligatoria.';
    } else if (this.password.length < 8) {
      this.errors.password = 'La contraseña debe tener 8 caracteres.';
    }

    if (!this.confirm) {
      this.errors.confirm = 'La confirmación es obligatoria.';
    }

    if (!this.errors.password && !this.errors.confirm && this.password !== this.confirm) {
      this.errors.confirm = 'Las contraseñas no coinciden.';
    }

    return !this.errors.name && !this.errors.email && !this.errors.password && !this.errors.confirm;
  }

  onSubmit() {
    this.submitted = true;

    if (!this.validate()) {
      return;
    }

    this.router.navigate(['/dashboard']);
  }
}
