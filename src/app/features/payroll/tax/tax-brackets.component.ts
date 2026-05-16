// ============================================================
// tax-brackets.component.ts  (rewritten — standalone)
// Barème IR progressif — CRUD par exercice fiscal
// ============================================================
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { PayrollService, TaxBracket } from '../../../core/services/payroll-config.service';

@Component({
  selector: 'app-tax-brackets',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Barème IR</h1>
          <p class="page-subtitle">Gestion des tranches de l'impôt sur le revenu</p>
        </div>
        <button class="btn-primary" (click)="openCreate()">
          <span class="btn-icon">+</span> Ajouter une tranche
        </button>
      </div>

      <div *ngIf="errorMessage" class="alert alert-error">{{ errorMessage }}</div>
      <div *ngIf="successMessage" class="alert alert-success">{{ successMessage }}</div>

      <div *ngIf="editMode" class="card form-card">
        <h2>{{ selectedBracket ? 'Modifier la tranche' : 'Nouvelle tranche' }}</h2>
        <form [formGroup]="form" (ngSubmit)="save()">
          <div class="form-grid">
            <div class="form-group">
              <label>Montant minimum (MAD)</label>
              <input type="number" formControlName="minAmount" class="form-control" min="0" />
            </div>
            <div class="form-group">
              <label>Montant maximum (MAD) <span class="hint">vide = illimité</span></label>
              <input type="number" formControlName="maxAmount" class="form-control" min="0" />
            </div>
            <div class="form-group">
              <label>Taux (ex: 0.10 pour 10%)</label>
              <input type="number" formControlName="rate" class="form-control" min="0" max="1" step="0.01" />
            </div>
            <div class="form-group">
              <label>Déduction fixe (MAD)</label>
              <input type="number" formControlName="deduction" class="form-control" min="0" />
            </div>
            <div class="form-group">
              <label>Date d'effet</label>
              <input type="date" formControlName="effectiveFrom" class="form-control" />
            </div>
            <div class="form-group">
              <label>Date de fin <span class="hint">optionnelle</span></label>
              <input type="date" formControlName="effectiveTo" class="form-control" />
            </div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" (click)="cancel()">Annuler</button>
            <button type="submit" class="btn-primary" [disabled]="saving">
              {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
            </button>
          </div>
        </form>
      </div>

      <div class="card">
        <div *ngIf="loading" class="loading-state">Chargement...</div>
        <table *ngIf="!loading" class="data-table">
          <thead>
            <tr>
              <th>Tranche</th>
              <th>Taux</th>
              <th>Déduction</th>
              <th>Date d'effet</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let b of brackets">
              <td>{{ formatRange(b) }}</td>
              <td>{{ (b.rate * 100).toFixed(0) }} %</td>
              <td>{{ b.deduction.toLocaleString('fr-MA') }} MAD</td>
              <td>{{ b.effectiveFrom | date:'dd/MM/yyyy' }}</td>
              <td>
                <span [class]="b.isActive ? 'badge-active' : 'badge-inactive'">
                  {{ b.isActive ? 'Actif' : 'Inactif' }}
                </span>
              </td>
              <td>
                <button class="btn-icon-edit" (click)="openEdit(b)">✏️</button>
                <button class="btn-icon-delete" (click)="delete(b)">🗑️</button>
              </td>
            </tr>
            <tr *ngIf="brackets.length === 0">
              <td colspan="6" class="empty-state">Aucune tranche configurée.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .page-container { padding: 1.5rem; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
    .page-title { font-size: 1.5rem; font-weight: 600; margin: 0; }
    .page-subtitle { color: #6b7280; margin: 0.25rem 0 0; }
    .card { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 1.5rem; margin-bottom: 1rem; }
    .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.25rem; }
    .form-group label { font-size: 0.875rem; font-weight: 500; }
    .form-control { border: 1px solid #d1d5db; border-radius: 6px; padding: 0.5rem 0.75rem; font-size: 0.875rem; }
    .hint { font-weight: 400; color: #9ca3af; font-size: 0.75rem; }
    .form-actions { display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1rem; }
    .btn-primary { background: #4f46e5; color: white; border: none; border-radius: 6px; padding: 0.5rem 1rem; cursor: pointer; font-size: 0.875rem; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-secondary { background: white; color: #374151; border: 1px solid #d1d5db; border-radius: 6px; padding: 0.5rem 1rem; cursor: pointer; font-size: 0.875rem; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th, .data-table td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid #f3f4f6; font-size: 0.875rem; }
    .data-table th { font-weight: 600; color: #374151; background: #f9fafb; }
    .badge-active { background: #d1fae5; color: #065f46; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.75rem; }
    .badge-inactive { background: #f3f4f6; color: #6b7280; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.75rem; }
    .alert { padding: 0.75rem 1rem; border-radius: 6px; margin-bottom: 1rem; }
    .alert-error { background: #fee2e2; color: #991b1b; }
    .alert-success { background: #d1fae5; color: #065f46; }
    .loading-state, .empty-state { text-align: center; color: #9ca3af; padding: 2rem; }
    .btn-icon-edit, .btn-icon-delete { background: none; border: none; cursor: pointer; padding: 0.25rem; }
  `]
})
export class TaxBracketsComponent implements OnInit, OnDestroy {

  brackets: TaxBracket[] = [];
  loading = false;
  saving = false;
  editMode = false;
  selectedBracket?: TaxBracket;

  form!: FormGroup;
  errorMessage = '';
  successMessage = '';

  private destroy$ = new Subject<void>();

  constructor(private payrollSvc: PayrollService, private fb: FormBuilder) {}

  ngOnInit(): void {
    this.buildForm();
    this.loadBrackets();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      minAmount:     [null, [Validators.required, Validators.min(0)]],
      maxAmount:     [null],
      rate:          [null, [Validators.required, Validators.min(0), Validators.max(1)]],
      deduction:     [0,    [Validators.required, Validators.min(0)]],
      effectiveFrom: ['',   Validators.required],
      effectiveTo:   [''],
    });
  }

  loadBrackets(): void {
    this.loading = true;
    this.payrollSvc.getTaxBrackets()
      .pipe(takeUntil(this.destroy$), finalize(() => this.loading = false))
      .subscribe({
        next: (brackets: TaxBracket[]) => {
          this.brackets = brackets.sort((a: TaxBracket, b: TaxBracket) => a.minAmount - b.minAmount);
        },
        error: (err: Error) => { this.errorMessage = err.message; }
      });
  }

  openCreate(): void {
    this.selectedBracket = undefined;
    this.editMode = true;
    this.form.reset({ deduction: 0, effectiveFrom: new Date().toISOString().substring(0, 10) });
  }

  openEdit(bracket: TaxBracket): void {
    this.selectedBracket = bracket;
    this.editMode = true;
    this.form.patchValue({
      minAmount:     bracket.minAmount,
      maxAmount:     bracket.maxAmount ?? null,
      rate:          bracket.rate,
      deduction:     bracket.deduction,
      effectiveFrom: new Date(bracket.effectiveFrom).toISOString().substring(0, 10),
      effectiveTo:   bracket.effectiveTo ? new Date(bracket.effectiveTo).toISOString().substring(0, 10) : ''
    });
  }

  cancel(): void {
    this.editMode = false;
    this.selectedBracket = undefined;
    this.form.reset();
    this.errorMessage = '';
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const payload: Partial<TaxBracket> = { ...this.form.value };
    if (!payload.maxAmount) payload.maxAmount = undefined;
    if (!payload.effectiveTo) payload.effectiveTo = undefined;

    const obs = this.selectedBracket
      ? this.payrollSvc.updateTaxBracket(this.selectedBracket.id, payload)
      : this.payrollSvc.createTaxBracket(payload);

    obs.pipe(takeUntil(this.destroy$), finalize(() => this.saving = false))
      .subscribe({
        next: () => {
          this.successMessage = 'Tranche sauvegardée.';
          this.editMode = false;
          this.loadBrackets();
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (err: Error) => { this.errorMessage = err.message; }
      });
  }

  delete(bracket: TaxBracket): void {
    if (!confirm(`Supprimer la tranche ${this.formatRange(bracket)} ?`)) return;
    this.payrollSvc.deleteTaxBracket(bracket.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.loadBrackets(),
        error: (err: Error) => { this.errorMessage = err.message; }
      });
  }

  formatRange(b: TaxBracket): string {
    const max = b.maxAmount ? (b.maxAmount | 0).toLocaleString('fr-MA') + ' MAD' : '∞';
    return `${b.minAmount.toLocaleString('fr-MA')} — ${max}`;
  }
}
