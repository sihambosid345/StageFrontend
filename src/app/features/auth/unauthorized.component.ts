import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="unauth-page">
      <div class="unauth-card">
        <div class="unauth-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48">
            <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
        </div>
        <h1>Accès refusé</h1>
        <p>Vous n'avez pas les droits nécessaires pour accéder à cette page.<br>Cette section est réservée aux administrateurs.</p>
        <div class="unauth-info">
          <span>Connecté en tant que :</span>
          <strong>{{ auth.currentUser()?.firstName }} {{ auth.currentUser()?.lastName }}</strong>
          <span class="role-badge">{{ auth.userRole() }}</span>
        </div>
        <div class="unauth-actions">
          <button class="btn-back" (click)="goBack()">← Retour au tableau de bord</button>
          <button class="btn-logout" (click)="auth.logout()">Se déconnecter</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .unauth-page {
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8f9fc;
      padding: 24px;
    }
    .unauth-card {
      background: white;
      border-radius: 20px;
      padding: 48px;
      text-align: center;
      max-width: 480px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.08);
      border: 1px solid #e5e7eb;
    }
    .unauth-icon {
      width: 80px; height: 80px;
      background: #fef2f2;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 24px;
      color: #ef4444;
    }
    h1 {
      font-family: 'Sora', sans-serif;
      font-size: 1.6rem; font-weight: 700;
      color: #111827; margin-bottom: 12px;
    }
    p { color: #6b7280; font-size: 0.9rem; line-height: 1.6; margin-bottom: 24px; }
    .unauth-info {
      background: #f9fafb; border-radius: 10px;
      padding: 14px 20px; display: flex;
      align-items: center; gap: 8px;
      font-size: 0.855rem; margin-bottom: 28px;
      flex-wrap: wrap; justify-content: center;
      span { color: #6b7280; }
      strong { color: #111827; }
    }
    .role-badge {
      background: #fef3c7; color: #92400e;
      padding: 2px 10px; border-radius: 20px;
      font-size: 0.75rem; font-weight: 700;
    }
    .unauth-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
    .btn-back {
      padding: 10px 20px; background: #6366f1; color: white;
      border: none; border-radius: 8px; cursor: pointer;
      font-family: 'DM Sans', sans-serif; font-size: 0.875rem; font-weight: 500;
      &:hover { background: #4f46e5; }
    }
    .btn-logout {
      padding: 10px 20px; background: #fee2e2; color: #dc2626;
      border: none; border-radius: 8px; cursor: pointer;
      font-family: 'DM Sans', sans-serif; font-size: 0.875rem; font-weight: 500;
      &:hover { background: #fecaca; }
    }
  `]
})
export class UnauthorizedComponent {
  constructor(public auth: AuthService, private router: Router) {}
  goBack() { this.router.navigate(['/dashboard']); }
}
