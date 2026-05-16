import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TaxBracket } from '../../../core/services/payroll-config.service';

@Component({
  selector: 'app-payroll-config-warning',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="warning-container" *ngIf="hasWarnings">

      <!-- Barème IR manquant — reproduit exactement l'erreur de la capture d'écran mais en actionnable -->
      <div class="alert alert-error" *ngIf="missingBrackets.length > 0">
        <div class="alert-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <div class="alert-body">
          <p class="alert-title">Aucun barème IR (IR_SALAIRE) actif trouvé pour la date {{ configDate }}.</p>
          <p class="alert-desc">
            Le calcul de la paie ne pourra pas s'exécuter sans barème IR valide.
            <a routerLink="/payroll/tax-brackets" class="alert-link">→ Configurer le barème IR</a>
          </p>
        </div>
        <button class="alert-close" (click)="dismiss('brackets')" title="Fermer">✕</button>
      </div>

      <!-- Taux légaux manquants -->
      <div class="alert alert-warning" *ngIf="missingRates.length > 0">
        <div class="alert-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div class="alert-body">
          <p class="alert-title">Taux légaux manquants pour la date {{ configDate }}</p>
          <div class="missing-list">
            <span class="missing-tag" *ngFor="let code of missingRates">{{ code }}</span>
          </div>
          <a routerLink="/payroll/statutory-rates" class="alert-link">→ Configurer les taux légaux</a>
        </div>
        <button class="alert-close" (click)="dismiss('rates')" title="Fermer">✕</button>
      </div>

    </div>
  `,
  styles: [`
    .warning-container { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }

    .alert {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 14px 16px; border-radius: 10px;
      border-left: 4px solid; animation: slideIn 0.25s ease;
    }
    @keyframes slideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }

    .alert-error {
      background: #fff1f2; border-color: #ef4444;
    }
    .alert-error .alert-icon { color: #dc2626; }

    .alert-warning {
      background: #fffbeb; border-color: #f59e0b;
    }
    .alert-warning .alert-icon { color: #d97706; }

    .alert-icon { flex-shrink: 0; margin-top: 2px; }

    .alert-body { flex: 1; }
    .alert-title { margin: 0 0 4px; font-size: 14px; font-weight: 600; color: #111827; line-height: 1.4; }
    .alert-desc { margin: 0; font-size: 13px; color: #6b7280; }

    .alert-link {
      color: #4f46e5; font-weight: 600; text-decoration: none; font-size: 13px;
      display: inline-block; margin-top: 6px;
    }
    .alert-link:hover { text-decoration: underline; }

    .missing-list { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0 4px; }
    .missing-tag {
      background: #fef3c7; color: #92400e;
      border: 1px solid #fcd34d; border-radius: 4px;
      padding: 2px 8px; font-size: 11px; font-weight: 700; font-family: monospace;
    }

    .alert-close {
      background: none; border: none; cursor: pointer;
      color: #9ca3af; font-size: 16px; line-height: 1;
      padding: 2px 4px; margin-left: 4px; flex-shrink: 0;
    }
    .alert-close:hover { color: #374151; }
  `]
})
export class PayrollConfigWarningComponent {
  @Input() missingRates: string[] = [];
  @Input() missingBrackets: TaxBracket[] = [];
  @Input() configDate = '';
  @Output() dismissed = new EventEmitter<void>();

  get hasWarnings(): boolean {
    return this.missingRates.length > 0 || this.missingBrackets.length > 0;
  }

  dismiss(type: 'rates' | 'brackets'): void {
    if (type === 'rates') this.missingRates = [];
    if (type === 'brackets') this.missingBrackets = [];
    if (!this.hasWarnings) this.dismissed.emit();
  }
}