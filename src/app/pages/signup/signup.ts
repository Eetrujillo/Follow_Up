import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { UserService } from '../../shared/services/user';
import { finalize } from 'rxjs/operators';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-signup',
  standalone: true,

  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './signup.html',
  styleUrl: './signup.css'
})
export class Signup {
  signupForm: FormGroup;
  errorMessage = '';
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private userService: UserService,
    private cdRef: ChangeDetectorRef

  ) {
    this.signupForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirm: ['', [Validators.required]]
    }, { validators: this.passwordsMatch });
  }

  passwordsMatch(group: FormGroup) {
    const pass = group.get('password')?.value;
    const confirm = group.get('confirm')?.value;
    return pass === confirm ? null : { noMatch: true };
  }

  get name() { return this.signupForm.get('name'); }
  get email() { return this.signupForm.get('email'); }
  get password() { return this.signupForm.get('password'); }
  get confirm() { return this.signupForm.get('confirm'); }

  onSubmit() {
  this.errorMessage = '';

  if (this.signupForm.invalid) {
    this.signupForm.markAllAsTouched();
    return;
  }

  const { name, email, password } = this.signupForm.value;
  this.isLoading = true;

  this.userService.register(name, email, password)
    .pipe(finalize(() => {
      console.log('Finalize ejecutado, apagando isLoading');
      this.isLoading = false;
    }))
    .subscribe({
      next: (user) => {
        console.log('Registro exitoso:', user);
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Error en subscribe:', err);
        this.errorMessage = err?.message || 'Error al registrar';
        this.cdRef.detectChanges();
      }
    });
}

}
