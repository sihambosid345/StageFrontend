import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { PayrollService, PayrollRun, PayrollCalculationResult } from '../../../../core/services/payroll-config.service';

@Component({
  selector: 'app-calculate-run',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
<div class="page-container">

  <!-- Header -->
  <div class="page-header">
    <button class="btn-back" (click)="goBack()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 12H5M12 5l-7 7 7 7"/>
      </svg>
      Retour
    </button>
    <div>
      <h1 class="page-title">Calcul de la paie</h1>
      <p class="page-subtitle" *ngIf="run">
        Run #{{ run.runNumber }} —
        {{ run.period ? formatPeriod(run.period) : '—' }}
      </p>
    </div>
  </div>

  <!-- Chargement -->
  <div class="loading-state" *ngIf="loadingRun">
    <div class="spinner"></div> Chargement du run...
  </div>

  <ng-container *ngIf="!loadingRun && run">

    <!-- Statut card -->
    <div class="status-card" [ngClass]="'status-' + run.status.toLowerCase()">
      <span class="status-icon">
        {{ run.status === 'DRAFT'      ? '📋' :
           run.status === 'PROCESSING' ? '⏳' :
           run.status === 'COMPLETED'  ? '✅' :
           run.status === 'LOCKED'     ? '🔒' : '❌' }}
      </span>
      <div class="status-info">
        <div class="status-label">Statut actuel</div>
        <div class="status-value">
          <span class="badge" [ngClass]="getStatusClass(run.status)">{{ run.status }}</span>
        </div>
      </div>
      <div class="status-period" *ngIf="run.period">
        <div class="status-label">Période</div>
        <div class="status-value-text">{{ formatPeriod(run.period) }}</div>
      </div>
    </div>

    <!-- Stats (si déjà calculé) -->
    <div class="stats-grid" *ngIf="run.status === 'COMPLETED' || run.status === 'LOCKED'">
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-label">Employés traités</div>
        <div class="stat-value">{{ run.employeeCount ?? 0 }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-label">Total Brut</div>
        <div class="stat-value">{{ (run.totalGross ?? 0) | number:'1.2-2' }} MAD</div>
      </div>
      <div class="stat-card highlight">
        <div class="stat-icon">💵</div>
        <div class="stat-label">Total Net</div>
        <div class="stat-value net">{{ (run.totalNet ?? 0) | number:'1.2-2' }} MAD</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🏢</div>
        <div class="stat-label">Charges patronales</div>
        <div class="stat-value">{{ (run.employerContributions ?? 0) | number:'1.2-2' }} MAD</div>
      </div>
    </div>

    <!-- Résultat du calcul -->
    <div class="result-card" *ngIf="result">
      <div class="result-header">
        <h3>✅ Calcul terminé</h3>
      </div>
      <div class="result-body">
        <div class="result-stat ok">
          <span class="result-num">{{ result.processedCount }}</span>
          <span class="result-lbl">Bulletins générés</span>
        </div>
        <div class="result-stat total">
          <span class="result-num">{{ result.totalGross | number:'1.2-2' }}</span>
          <span class="result-lbl">Total Brut (MAD)</span>
        </div>
        <div class="result-stat net">
          <span class="result-num">{{ result.totalNet | number:'1.2-2' }}</span>
          <span class="result-lbl">Total Net (MAD)</span>
        </div>
        <div class="result-stat err" *ngIf="result.errorCount > 0">
          <span class="result-num">{{ result.errorCount }}</span>
          <span class="result-lbl">Erreurs</span>
        </div>
      </div>
      <!-- Détail erreurs -->
      <div class="errors-list" *ngIf="result.errors && result.errors.length > 0">
        <div class="errors-title">⚠️ Détail des erreurs :</div>
        <div *ngFor="let e of result.errors" class="error-item">
          <span class="error-emp">Employé {{ e.employeeId }}</span>
          <span class="error-msg">{{ e.message }}</span>
        </div>
      </div>
    </div>

    <!-- Erreur API -->
    <div class="error-banner" *ngIf="calcError">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      {{ calcError }}
    </div>

    <!-- ─── Actions selon statut ─── -->

    <!-- DRAFT → Lancer le calcul -->
    <div class="actions-bar" *ngIf="run.status === 'DRAFT'">
      <div class="action-info">
        <p>Le run est en brouillon. Lancez le calcul pour générer les bulletins de paie.</p>
      </div>
      <button class="btn-primary btn-lg" [disabled]="calculating" (click)="calculate()">
        <span *ngIf="!calculating">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:6px">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          Lancer le calcul
        </span>
        <span *ngIf="calculating">
          <div class="spinner-sm"></div> Calcul en cours...
        </span>
      </button>
    </div>

    <!-- ERROR → Réessayer -->
    <div class="actions-bar" *ngIf="run.status === 'ERROR'">
      <div class="action-info error-info">
        <p>❌ Le calcul a échoué. Vérifiez la configuration des taux et du barème IR, puis réessayez.</p>
      </div>
      <button class="btn-warning btn-lg" [disabled]="calculating" (click)="calculate()">
        <span *ngIf="!calculating">🔄 Réessayer le calcul</span>
        <span *ngIf="calculating"><div class="spinner-sm"></div> Calcul en cours...</span>
      </button>
    </div>

    <!-- COMPLETED → Voir bulletins + Verrouiller -->
    <div class="actions-bar" *ngIf="run.status === 'COMPLETED'">
      <div class="action-info success-info">
        <p>✅ Calcul terminé. Vérifiez les bulletins avant de verrouiller définitivement.</p>
      </div>
      <div class="action-buttons">
        <button class="btn-secondary btn-lg" (click)="viewPayslips()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:6px">
            <rect x="4" y="2" width="16" height="20" rx="2"/>
            <line x1="8" y1="7" x2="16" y2="7"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
          Voir les bulletins ({{ run.employeeCount ?? 0 }})
        </button>
        <button class="btn-primary btn-lg" [disabled]="locking" (click)="lock()">
          <span *ngIf="!locking">🔒 Verrouiller le run</span>
          <span *ngIf="locking"><div class="spinner-sm"></div> Verrouillage...</span>
        </button>
      </div>
    </div>

    <!-- LOCKED → Lecture seule -->
    <div class="actions-bar" *ngIf="run.status === 'LOCKED'">
      <div class="action-info locked-info">
        <p>🔒 Ce run est verrouillé. Aucune modification n'est possible.</p>
      </div>
      <button class="btn-secondary btn-lg" (click)="viewPayslips()">
        📋 Voir les bulletins ({{ run.employeeCount ?? 0 }})
      </button>
    </div>

  </ng-container>

  <!-- Run introuvable -->
  <div class="not-found" *ngIf="!loadingRun && !run">
    <p>Run introuvable.</p>
    <button class="btn-secondary" (click)="goBack()">← Retour</button>
  </div>

</div>
  `,
  styles: [`
    .page-container { padding: 24px; max-width: 960px; }

    /* Header */
    .page-header { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 28px; }
    .btn-back {
      display: flex; align-items: center; gap: 6px;
      background: #f3f4f6; border: none; padding: 8px 14px;
      border-radius: 8px; cursor: pointer; font-size: 14px; color: #374151;
      transition: background 0.15s;
    }
    .btn-back:hover { background: #e5e7eb; }
    .page-title { font-size: 22px; font-weight: 700; color: #1a1a2e; margin: 0; }
    .page-subtitle { font-size: 13px; color: #6b7280; margin: 4px 0 0; }

    /* Loading */
    .loading-state { text-align: center; padding: 60px; color: #9ca3af; font-size: 15px; }
    .spinner {
      display: inline-block; width: 20px; height: 20px;
      border: 2px solid #e5e7eb; border-top-color: #4f46e5;
      border-radius: 50%; animation: spin 0.8s linear infinite;
      vertical-align: middle; margin-right: 8px;
    }
    .spinner-sm {
      display: inline-block; width: 14px; height: 14px;
      border: 2px solid rgba(255,255,255,0.4); border-top-color: white;
      border-radius: 50%; animation: spin 0.8s linear infinite;
      vertical-align: middle; margin-right: 6px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Status card */
    .status-card {
      display: flex; align-items: center; gap: 20px;
      padding: 20px 24px; border-radius: 12px; margin-bottom: 24px;
      border: 1.5px solid #e5e7eb; background: #f9fafb;
    }
    .status-draft     { border-color: #d1d5db; background: #f9fafb; }
    .status-processing{ border-color: #fcd34d; background: #fffbeb; }
    .status-completed { border-color: #6ee7b7; background: #f0fdf4; }
    .status-locked    { border-color: #c4b5fd; background: #faf5ff; }
    .status-error     { border-color: #fca5a5; background: #fef2f2; }
    .status-icon { font-size: 2.5rem; }
    .status-info, .status-period { display: flex; flex-direction: column; gap: 4px; }
    .status-label { font-size: 11px; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.05em; }
    .status-value-text { font-size: 16px; font-weight: 700; color: #1a1a2e; }

    /* Badge */
    .badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .badge-draft { background: #f3f4f6; color: #374151; }
    .badge-processing { background: #fef3c7; color: #92400e; }
    .badge-completed { background: #d1fae5; color: #065f46; }
    .badge-locked { background: #ede9fe; color: #5b21b6; }
    .badge-error { background: #fee2e2; color: #991b1b; }

    /* Stats */
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
    .stat-card {
      background: white; border: 1px solid #e5e7eb;
      border-radius: 12px; padding: 18px; transition: box-shadow 0.15s;
    }
    .stat-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .stat-card.highlight { border-color: #a7f3d0; background: #f0fdf4; }
    .stat-icon { font-size: 1.5rem; margin-bottom: 8px; }
    .stat-label { font-size: 12px; color: #6b7280; margin-bottom: 6px; }
    .stat-value { font-size: 20px; font-weight: 700; color: #1a1a2e; }
    .stat-value.net { color: #059669; }

    /* Result card */
    .result-card {
      background: white; border: 1.5px solid #6ee7b7;
      border-radius: 12px; margin-bottom: 24px; overflow: hidden;
    }
    .result-header { background: #f0fdf4; padding: 14px 20px; border-bottom: 1px solid #d1fae5; }
    .result-header h3 { margin: 0; font-size: 15px; color: #065f46; }
    .result-body { display: flex; gap: 0; }
    .result-stat {
      flex: 1; padding: 20px; display: flex; flex-direction: column;
      align-items: center; gap: 6px; border-right: 1px solid #f0f0f0;
    }
    .result-stat:last-child { border-right: none; }
    .result-num { font-size: 24px; font-weight: 800; }
    .result-lbl { font-size: 12px; color: #9ca3af; text-align: center; }
    .result-stat.ok   .result-num { color: #059669; }
    .result-stat.total .result-num { color: #1a1a2e; }
    .result-stat.net  .result-num { color: #4f46e5; }
    .result-stat.err  .result-num { color: #dc2626; }
    .errors-list { padding: 16px 20px; border-top: 1px solid #fecaca; background: #fef2f2; }
    .errors-title { font-size: 13px; font-weight: 600; color: #991b1b; margin-bottom: 8px; }
    .error-item {
      display: flex; gap: 12px; padding: 8px 12px;
      background: white; border-radius: 6px; margin-bottom: 6px;
      border: 1px solid #fecaca; font-size: 13px;
    }
    .error-emp { font-weight: 600; color: #374151; }
    .error-msg { color: #991b1b; }

    /* Error banner */
    .error-banner {
      display: flex; align-items: center; gap: 8px;
      background: #fee2e2; color: #991b1b;
      padding: 14px 18px; border-radius: 10px;
      font-size: 14px; margin-bottom: 20px;
    }

    /* Actions */
    .actions-bar {
      background: white; border: 1.5px solid #e5e7eb;
      border-radius: 12px; padding: 24px; display: flex;
      align-items: center; justify-content: space-between; gap: 20px;
      flex-wrap: wrap;
    }
    .action-info p { margin: 0; font-size: 14px; color: #374151; }
    .error-info p { color: #991b1b; }
    .success-info p { color: #065f46; }
    .locked-info p { color: #5b21b6; }
    .action-buttons { display: flex; gap: 12px; flex-wrap: wrap; }

    .btn-primary {
      display: inline-flex; align-items: center;
      background: #4f46e5; color: white; border: none;
      padding: 12px 24px; border-radius: 10px; cursor: pointer;
      font-weight: 600; font-size: 15px; transition: background 0.2s;
    }
    .btn-primary:hover:not(:disabled) { background: #4338ca; }
    .btn-primary:disabled { background: #9ca3af; cursor: not-allowed; }

    .btn-secondary {
      display: inline-flex; align-items: center;
      background: white; color: #374151;
      border: 1.5px solid #d1d5db; padding: 12px 24px;
      border-radius: 10px; cursor: pointer;
      font-weight: 600; font-size: 15px; transition: all 0.2s;
    }
    .btn-secondary:hover { background: #f9fafb; border-color: #9ca3af; }

    .btn-warning {
      display: inline-flex; align-items: center;
      background: #f59e0b; color: white; border: none;
      padding: 12px 24px; border-radius: 10px; cursor: pointer;
      font-weight: 600; font-size: 15px;
    }
    .btn-warning:disabled { opacity: 0.6; cursor: not-allowed; }

    .not-found { text-align: center; padding: 60px; color: #9ca3af; }
    .not-found p { margin-bottom: 16px; }
  `]
})
export class CalculateRunComponent implements OnInit, OnDestroy {
  run: PayrollRun | null = null;
  result: PayrollCalculationResult | null = null;
  loadingRun = true;
  calculating = false;
  locking = false;
  calcError: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private payrollSvc: PayrollService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.goBack(); return; }
    this.loadRun(id);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadRun(id: string): void {
    this.payrollSvc.getPayrollRun(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (run) => { this.run = run; this.loadingRun = false; },
        error: () => { this.loadingRun = false; }
      });
  }

  calculate(): void {
    if (!this.run) return;
    this.calculating = true;
    this.calcError = null;
    this.result = null;
    this.payrollSvc.calculateRun(this.run.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.result = result;
          this.calculating = false;
          // Recharger le run pour mettre à jour le statut
          this.loadRun(this.run!.id);
        },
        error: (e) => {
          this.calculating = false;
          this.calcError = e?.error?.message ?? 'Erreur lors du calcul. Vérifiez la configuration des taux et du barème IR.';
        }
      });
  }

  lock(): void {
    if (!this.run) return;
    if (!confirm('Verrouiller ce run ? Cette action est irréversible.')) return;
    this.locking = true;
    this.payrollSvc.lockRun(this.run.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (run) => { this.run = run; this.locking = false; },
        error: (e) => {
          this.locking = false;
          this.calcError = e?.error?.message ?? 'Erreur lors du verrouillage.';
        }
      });
  }

  viewPayslips(): void {
    if (!this.run) return;
    this.router.navigate(['/payroll/runs', this.run.id, 'payslips']);
  }

  goBack(): void {
    this.router.navigate(['/payroll/runs']);
  }

  formatPeriod(period: string | null | undefined): string {
    if (!period) return '—';
    const parts = period.split('-');
    if (parts.length < 2) return period;
    const [year, month] = parts;
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    return `${months[parseInt(month, 10) - 1] ?? month} ${year}`;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      DRAFT: 'badge-draft', PROCESSING: 'badge-processing',
      COMPLETED: 'badge-completed', LOCKED: 'badge-locked', ERROR: 'badge-error'
    };
    return map[status] || 'badge-draft';
  }
}