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
      this.errors.name = '¿Cuál es tu nombre?';
    }

    if (!this.email.trim()) {
      this.errors.email = 'Necesitamos tu correo para continuar.';
    } else if (!this.email.includes('@')) {
      this.errors.email = 'Por favor, ingresa un correo válido.';
    }

    if (!this.password) {
      this.errors.password = 'Elige una contraseña segura.';
    } else if (this.password.length < 8) {
      this.errors.password = 'La contraseña debe tener al menos 8 caracteres.';
    }

    if (!this.confirm) {
      this.errors.confirm = 'Confirma tu contraseña, por favor.';
    }

    if (!this.errors.password && !this.errors.confirm && this.password !== this.confirm) {
      this.errors.confirm = 'Parece que las contraseñas no coinciden. ¡Intenta de nuevo!';
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
