import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  email    = '';
  password = '';
  error    = signal('');
  loading  = signal(false);
  showPass = false;

  constructor(private auth: AuthService, private router: Router) {
    // Already logged in → redirect
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  submit() {
    if (!this.email || !this.password) {
      this.error.set('Veuillez remplir tous les champs.');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (e) => {
        this.loading.set(false);
        this.error.set(e?.error?.error || e?.error?.message || 'Email ou mot de passe incorrect.');
      }
    });
  }

  onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') this.submit();
  }
}
