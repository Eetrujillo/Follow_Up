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

  constructor(private router: Router) {}

  onSubmit() {
    if (this.password !== this.confirm) {
      alert('Las contraseñas no coinciden');
      return;
    }
    console.log('Registrando:', this.email);
    this.router.navigate(['/dashboard']);
  }
}