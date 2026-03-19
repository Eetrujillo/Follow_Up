import { Component } from '@angular/core';
import { Router} from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule], 
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class Login {
  verPassword: boolean = false;
  email: string = '';
  password: string = '';
  mostrarErrorEmail: boolean = false;
  mostrarErrorPassword: boolean = false;
  mensajeErrorPassword: string = '';

  constructor(private router: Router) { }

  toggleOjo() {
    this.verPassword = !this.verPassword;
  }

  validarEmail() {
    if (this.email.trim() === '') {
      this.mostrarErrorEmail = false;
    } else if (!this.email.includes('@')) {
      this.mostrarErrorEmail = true;
    } else {
      this.mostrarErrorEmail = false;
    }
  }

  validarPassword() {
    if (this.password.trim() === '') {
      this.mostrarErrorPassword = true;
      this.mensajeErrorPassword = 'La contraseña es requerida';
    } else if (this.password.length < 8) {
      this.mostrarErrorPassword = true;
      this.mensajeErrorPassword = 'La contraseña debe tener minimo 8 caracteres';
    } else {
      this.mostrarErrorPassword = false;
    }
  }

  goToSignup() {
    console.log("Navegando a signup...");
    this.router.navigate(['/signup']);
    
  }
}