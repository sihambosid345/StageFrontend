import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { PayrollService, TaxBracket } from '../services/payroll.service';

@Component({
  selector: 'app-tax-brackets',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Barème IR (IR_SALAIRE)</h1>
          <p class="page-subtitle">Tranches d'imposition sur le revenu — lecture depuis la base de données</p>
        </div>
        <button class="btn-primary" (click)="openForm()">+ Nouvelle tranche</button>
      </div>

      <!-- Filtre date -->
      <div class="filter-bar">
        <label>Date de référence</label>
        <input type="date" [(ngModel)]="filterDate" (change)="loadBrackets()" class="form-input-sm">
        <span class="tag-info">
          {{ brackets.length }} tranche(s) active(s) au {{ filterDate }}
        </span>
      </div>

      <!-- Tableau tranches -->
      <div class="card">
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>TRANCHE</th>
                <th>MONTANT MIN (MAD)</th>
                <th>MONTANT MAX (MAD)</th>
                <th>TAUX (%)</th>
                <th>DÉDUCTION (MAD)</th>
                <th>EFFECTIF DU</th>
                <th>EFFECTIF AU</th>
                <th>VERSION</th>
                <th>STATUT</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="loading">
                <td colspan="10" class="loading-cell"><div class="spinner"></div> Chargement...</td>
              </tr>
              <tr *ngIf="!loading && brackets.length === 0">
                <td colspan="10" class="empty-cell">
                  <div class="empty-state">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <p>Aucun barème IR configuré pour le {{ filterDate }}</p>
                    <button class="btn-primary" (click)="openForm()">Créer le premier barème</button>
                  </div>
                </td>
              </tr>
              <tr *ngFor="let b of brackets; let i = index" class="table-row">
                <td><span class="tranche-badge">T{{ i + 1 }}</span></td>
                <td class="amount">{{ b.minAmount | number:'1.0-0' }}</td>
                <td class="amount">{{ b.maxAmount ? (b.maxAmount | number:'1.0-0') : '∞' }}</td>
                <td><span class="rate-pill">{{ (b.rate * 100) | number:'1.0-2' }}%</span></td>
                <td class="amount">{{ b.deduction | number:'1.0-0' }}</td>
                <td>{{ b.effectiveFrom | date:'dd/MM/yyyy' }}</td>
                <td>{{ b.effectiveTo ? (b.effectiveTo | date:'dd/MM/yyyy') : '—' }}</td>
                <td><span class="version-badge">v{{ b.version }}</span></td>
                <td>
                  <span class="status-dot" [class.active]="b.isActive" [class.inactive]="!b.isActive">
                    {{ b.isActive ? 'Actif' : 'Inactif' }}
                  </span>
                </td>
                <td class="actions-cell">
                  <button class="action-btn btn-edit" (click)="editBracket(b)" title="Modifier">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button class="action-btn btn-delete" (click)="deleteBracket(b)" title="Supprimer">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Visualisation barème -->
      <div class="card mt-4" *ngIf="brackets.length > 0">
        <div class="card-header">
          <span class="card-title">Visualisation du barème progressif</span>
        </div>
        <div class="bracket-viz">
          <div class="bracket-bar" *ngFor="let b of brackets; let i = index"
               [style.flex]="getBracketFlex(b)"
               [style.background]="getBracketColor(i)"
               [title]="getBracketLabel(b)">
            <span class="bracket-label">{{ (b.rate * 100) | number:'1.0-0' }}%</span>
          </div>
        </div>
        <div class="bracket-legend">
          <div class="legend-item" *ngFor="let b of brackets; let i = index">
            <span class="legend-color" [style.background]="getBracketColor(i)"></span>
            <span>{{ b.minAmount | number:'1.0-0' }}{{ b.maxAmount ? ' – ' + (b.maxAmount | number:'1.0-0') : '+' }} MAD → {{ (b.rate * 100) | number:'1.0-0' }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Formulaire modal -->
    <div class="modal-overlay" *ngIf="showForm" (click)="closeForm()">
      <div class="modal modal-lg" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>{{ editingId ? 'Modifier la tranche' : 'Nouvelle tranche IR' }}</h2>
          <button class="modal-close" (click)="closeForm()">✕</button>
        </div>
        <div class="modal-body" [formGroup]="bracketForm">
          <div class="form-grid">
            <div class="form-field">
              <label>Montant minimum (MAD)</label>
              <input type="number" formControlName="minAmount" class="form-input" placeholder="0">
              <span class="field-error" *ngIf="bracketForm.get('minAmount')?.invalid && bracketForm.get('minAmount')?.touched">
                Champ requis
              </span>
            </div>
            <div class="form-field">
              <label>Montant maximum (MAD) <span class="optional">— laisser vide si illimité</span></label>
              <input type="number" formControlName="maxAmount" class="form-input" placeholder="Illimité">
            </div>
            <div class="form-field">
              <label>Taux (%)</label>
              <input type="number" formControlName="rate" step="0.01" class="form-input" placeholder="ex: 10">
              <span class="field-hint">Entrer 10 pour 10% — sera converti en 0.10</span>
            </div>
            <div class="form-field">
              <label>Déduction fixe (MAD)</label>
              <input type="number" formControlName="deduction" class="form-input" placeholder="0">
            </div>
            <div class="form-field">
              <label>Effectif du</label>
              <input type="date" formControlName="effectiveFrom" class="form-input">
            </div>
            <div class="form-field">
              <label>Effectif au <span class="optional">— laisser vide si indéfini</span></label>
              <input type="date" formControlName="effectiveTo" class="form-input">
            </div>
          </div>

          <div class="preview-box" *ngIf="bracketForm.valid">
            <p class="preview-title">Aperçu calcul IR sur cette tranche</p>
            <p class="preview-formula">
              IR = (Revenu imposable − {{ bracketForm.value.minAmount | number:'1.0-0' }}) × {{ bracketForm.value.rate }}% − {{ bracketForm.value.deduction | number:'1.0-0' }} MAD déduction
            </p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" (click)="closeForm()">Annuler</button>
          <button class="btn-primary" [disabled]="bracketForm.invalid || saving" (click)="saveBracket()">
            {{ saving ? 'Enregistrement...' : (editingId ? 'Mettre à jour' : 'Créer') }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; }
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; }
    .page-title { font-size: 24px; font-weight: 700; color: #1a1a2e; margin: 0; }
    .page-subtitle { font-size: 13px; color: #6b7280; margin: 4px 0 0; }

    .filter-bar {
      display: flex; align-items: center; gap: 12px;
      background: white; border-radius: 10px; padding: 12px 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08); margin-bottom: 16px;
      font-size: 14px; font-weight: 500; color: #374151;
    }
    .form-input-sm {
      border: 1px solid #d1d5db; border-radius: 6px; padding: 6px 10px;
      font-size: 14px; outline: none;
    }
    .tag-info {
      background: #eff6ff; color: #1d4ed8; border-radius: 20px;
      padding: 4px 12px; font-size: 12px; font-weight: 600;
    }

    .card { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
    .card-header { display: flex; align-items: center; padding: 16px 20px; border-bottom: 1px solid #f3f4f6; }
    .card-title { font-size: 15px; font-weight: 600; color: #111827; }
    .mt-4 { margin-top: 16px; }

    .table-wrapper { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th {
      background: #f9fafb; padding: 10px 14px; text-align: left;
      font-size: 11px; font-weight: 600; color: #6b7280;
      text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e5e7eb;
    }
    .data-table td { padding: 12px 14px; font-size: 14px; color: #374151; border-bottom: 1px solid #f3f4f6; }
    .table-row:hover { background: #f9fafb; }
    .amount { font-variant-numeric: tabular-nums; text-align: right; }

    .tranche-badge {
      background: #ede9fe; color: #5b21b6; border-radius: 4px;
      padding: 2px 8px; font-size: 12px; font-weight: 700;
    }
    .rate-pill {
      background: #dbeafe; color: #1e40af; border-radius: 20px;
      padding: 3px 10px; font-size: 13px; font-weight: 700;
    }
    .version-badge {
      background: #f3f4f6; color: #6b7280; border-radius: 4px;
      padding: 2px 6px; font-size: 11px; font-family: monospace;
    }
    .status-dot {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 12px; font-weight: 600;
    }
    .status-dot::before { content: ''; width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
    .status-dot.active { color: #059669; }
    .status-dot.active::before { background: #10b981; }
    .status-dot.inactive { color: #6b7280; }
    .status-dot.inactive::before { background: #d1d5db; }

    .actions-cell { display: flex; gap: 6px; }
    .action-btn { width: 30px; height: 30px; border-radius: 6px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .btn-edit { background: #f3f4f6; color: #374151; }
    .btn-edit:hover { background: #e5e7eb; }
    .btn-delete { background: #fee2e2; color: #991b1b; }
    .btn-delete:hover { background: #fecaca; }

    .loading-cell, .empty-cell { text-align: center; padding: 48px !important; }
    .spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid #e5e7eb; border-top-color: #4f46e5; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px; color: #9ca3af; }

    /* Visualisation */
    .bracket-viz { display: flex; height: 40px; margin: 16px 20px 8px; border-radius: 8px; overflow: hidden; gap: 2px; }
    .bracket-bar { display: flex; align-items: center; justify-content: center; min-width: 40px; transition: flex 0.3s; cursor: default; }
    .bracket-label { font-size: 12px; font-weight: 700; color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.3); }
    .bracket-legend { display: flex; flex-wrap: wrap; gap: 8px 16px; padding: 8px 20px 16px; }
    .legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #6b7280; }
    .legend-color { width: 12px; height: 12px; border-radius: 3px; flex-shrink: 0; }

    /* Boutons */
    .btn-primary {
      background: #4f46e5; color: white; border: none;
      padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;
    }
    .btn-primary:hover { background: #4338ca; }
    .btn-primary:disabled { background: #9ca3af; cursor: not-allowed; }
    .btn-secondary { background: white; color: #374151; border: 1px solid #d1d5db; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }

    /* Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal { background: white; border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
    .modal-lg { width: 600px; }
    .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #f3f4f6; }
    .modal-header h2 { font-size: 18px; font-weight: 700; margin: 0; }
    .modal-close { background: none; border: none; font-size: 18px; cursor: pointer; color: #6b7280; }
    .modal-body { padding: 24px; }
    .modal-footer { display: flex; gap: 12px; justify-content: flex-end; padding: 20px 24px; border-top: 1px solid #f3f4f6; }

    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .form-field { display: flex; flex-direction: column; gap: 6px; }
    .form-field label { font-size: 13px; font-weight: 500; color: #374151; }
    .optional { font-size: 11px; color: #9ca3af; font-weight: 400; }
    .form-input { border: 1px solid #d1d5db; border-radius: 8px; padding: 10px 12px; font-size: 14px; outline: none; }
    .form-input:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); }
    .field-error { font-size: 12px; color: #dc2626; }
    .field-hint { font-size: 11px; color: #6b7280; }

    .preview-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 12px 16px; margin-top: 16px; }
    .preview-title { margin: 0 0 6px; font-size: 12px; font-weight: 600; color: #0369a1; text-transform: uppercase; }
    .preview-formula { margin: 0; font-size: 13px; color: #0c4a6e; font-family: monospace; }
  `]
})
export class TaxBracketsComponent implements OnInit, OnDestroy {
  brackets: TaxBracket[] = [];
  loading = false;
  filterDate = new Date().toISOString().split('T')[0];
  showForm = false;
  editingId: string | null = null;
  saving = false;
  bracketForm: FormGroup;

  private colors = ['#6366f1','#8b5cf6','#a78bfa','#c4b5fd','#ddd6fe'];
  private destroy$ = new Subject<void>();

  constructor(private payrollSvc: PayrollService, private fb: FormBuilder) {
    this.bracketForm = this.fb.group({
      minAmount: [0, [Validators.required, Validators.min(0)]],
      maxAmount: [null],
      rate: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      deduction: [0, [Validators.required, Validators.min(0)]],
      effectiveFrom: ['', Validators.required],
      effectiveTo: [null]
    });
  }

  ngOnInit(): void { this.loadBrackets(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  loadBrackets(): void {
    this.loading = true;
    this.payrollSvc.getTaxBrackets('IR_SALAIRE', this.filterDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (b) => { this.brackets = b; this.loading = false; }, error: () => this.loading = false });
  }

  getBracketFlex(b: TaxBracket): number {
    if (!b.maxAmount) return 2;
    return Math.max(1, (b.maxAmount - b.minAmount) / 10000);
  }
  getBracketColor(i: number): string { return this.colors[i % this.colors.length]; }
  getBracketLabel(b: TaxBracket): string {
    return `${b.minAmount} – ${b.maxAmount ?? '∞'} MAD : ${(b.rate * 100).toFixed(0)}%`;
  }

  openForm(): void {
    this.editingId = null;
    this.bracketForm.reset({ minAmount: 0, rate: 0, deduction: 0, effectiveFrom: this.filterDate });
    this.showForm = true;
  }

  editBracket(b: TaxBracket): void {
    this.editingId = b.id;
    this.bracketForm.patchValue({
      minAmount: b.minAmount,
      maxAmount: b.maxAmount,
      rate: b.rate * 100,  // afficher en %
      deduction: b.deduction,
      effectiveFrom: b.effectiveFrom,
      effectiveTo: b.effectiveTo
    });
    this.showForm = true;
  }

  closeForm(): void { this.showForm = false; this.editingId = null; }

  saveBracket(): void {
    if (this.bracketForm.invalid) return;
    this.saving = true;
    const val = this.bracketForm.value;
    const payload: Partial<TaxBracket> = {
      code: 'IR_SALAIRE',
      minAmount: +val.minAmount,
      maxAmount: val.maxAmount ? +val.maxAmount : undefined,
      rate: +val.rate / 100,  // convertir % → décimal
      deduction: +val.deduction,
      effectiveFrom: val.effectiveFrom,
      effectiveTo: val.effectiveTo || undefined
    };

    const op$ = this.editingId
      ? this.payrollSvc.updateTaxBracket(this.editingId, payload)
      : this.payrollSvc.createTaxBracket(payload);

    op$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.saving = false; this.closeForm(); this.loadBrackets(); },
      error: () => { this.saving = false; }
    });
  }

  deleteBracket(b: TaxBracket): void {
    if (!confirm(`Supprimer la tranche ${b.minAmount} – ${b.maxAmount ?? '∞'} MAD ?`)) return;
    this.payrollSvc.deleteTaxBracket(b.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadBrackets());
  }
}