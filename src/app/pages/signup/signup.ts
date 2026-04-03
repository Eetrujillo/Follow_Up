import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { UserService } from '../../shared/services/user';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './signup.html',
  styleUrl: './signup.css'
})
export class Signup {

  signupForm: FormGroup;
  errorMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private userService: UserService
  ) {
    this.signupForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(1)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirm: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  private passwordMatchValidator(group: FormGroup): { [key: string]: any } | null {
    const password = group.get('password');
    const confirm = group.get('confirm');
    return password && confirm && password.value !== confirm.value ? { passwordMismatch: true } : null;
  }

  onSubmit() {
    this.errorMessage = '';

    if (this.signupForm.valid) {
      try {
        const formValue = this.signupForm.value;
        this.userService.createUser({
          name: formValue.name,
          email: formValue.email,
          password: formValue.password
        });

        this.router.navigate(['/dashboard']);
      } catch (error: any) {
        this.errorMessage = error.message;
      }
    } else {
      this.signupForm.markAllAsTouched();
    }
  }
}
