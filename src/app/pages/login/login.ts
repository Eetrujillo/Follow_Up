import { Component } from '@angular/core';
import { Router} from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [], 
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class Login {
  verPassword: boolean = false;

  constructor(private router: Router) { }

  toggleOjo() {
    this.verPassword = !this.verPassword;
  }

  goToSignup() {
    console.log("Navegando a signup...");
    this.router.navigate(['/signup']);
  }
}