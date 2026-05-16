// ============================================================
// statutory-rates.component.ts  (rewritten — standalone)
// Gestion des taux réglementaires (CNSS, AMO, CIMR) — CRUD
// ============================================================
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { PayrollService, StatutoryRate } from '../../../core/services/payroll-config.service';

interface RateGroup {
  code: string;
  label: string;
  rates: StatutoryRate[];
  currentRate?: StatutoryRate;
}

@Component({
  selector: 'app-statutory-rates',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Taux Réglementaires</h1>
          <p class="page-subtitle">CNSS, AMO, CIMR — cotisations salariales et patronales</p>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" (click)="toggleShowAll()">
            {{ showAll ? 'Actifs seulement' : 'Voir historique' }}
          </button>
          <button class="btn-primary" (click)="openCreate()">
            <span>+</span> Nouveau taux
          </button>
        </div>
      </div>

      <div *ngIf="errorMessage" class="alert alert-error">{{ errorMessage }}</div>
      <div *ngIf="successMessage" class="alert alert-success">{{ successMessage }}</div>

      <!-- Formulaire -->
      <div *ngIf="editMode" class="card form-card">
        <h2>{{ selectedRate ? 'Modifier le taux' : 'Nouveau taux' }}</h2>
        <form [formGroup]="form" (ngSubmit)="save()">
          <div class="form-grid">
            <div class="form-group">
              <label>Code</label>
              <select formControlName="code" class="form-control">
                <option value="">-- Sélectionner --</option>
                <option *ngFor="let rc of RATE_CODES" [value]="rc.code">{{ rc.label }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Libellé</label>
              <input type="text" formControlName="label" class="form-control" />
            </div>
            <div class="form-group">
              <label>Taux (ex: 0.0448 pour 4.48%)</label>
              <input type="number" formControlName="rate" class="form-control" min="0" max="1" step="0.0001" />
            </div>
            <div class="form-group">
              <label>Plafond mensuel (MAD) <span class="hint">optionnel</span></label>
              <input type="number" formControlName="ceiling" class="form-control" min="0" />
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

      <!-- Groupes par code -->
      <div *ngIf="loading" class="card loading-state">Chargement...</div>

      <div *ngFor="let group of rateGroups" class="card group-card">
        <div class="group-header">
          <div>
            <h3 class="group-title">{{ group.label }}</h3>
            <span *ngIf="group.currentRate" class="current-rate">
              Taux actuel : <strong>{{ (group.currentRate.rate * 100).toFixed(2) }} %</strong>
              <span *ngIf="group.currentRate.ceiling">
                — Plafond : {{ group.currentRate.ceiling!.toLocaleString('fr-MA') }} MAD
              </span>
            </span>
            <span *ngIf="!group.currentRate" class="no-rate">Aucun taux actif</span>
          </div>
          <button class="btn-sm" (click)="openCreateForCode(group.code, group.label)">+ Nouveau</button>
        </div>

        <table *ngIf="group.rates.length > 0" class="data-table">
          <thead>
            <tr>
              <th>Taux</th>
              <th>Plafond</th>
              <th>Date d'effet</th>
              <th>Date fin</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of group.rates">
              <td>{{ (r.rate * 100).toFixed(2) }} %</td>
              <td>{{ r.ceiling ? (r.ceiling | number:'1.0-0') + ' MAD' : '—' }}</td>
              <td>{{ r.effectiveFrom | date:'dd/MM/yyyy' }}</td>
              <td>{{ r.effectiveTo ? (r.effectiveTo | date:'dd/MM/yyyy') : '—' }}</td>
              <td>
                <span [class]="r.isActive ? 'badge-active' : 'badge-inactive'">
                  {{ r.isActive ? 'Actif' : 'Inactif' }}
                </span>
              </td>
              <td>
                <button class="btn-icon-edit" (click)="openEdit(r)">✏️</button>
                <button class="btn-icon-delete" *ngIf="!r.isActive" (click)="delete(r)">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
        <p *ngIf="group.rates.length === 0" class="empty-group">Aucun historique.</p>
      </div>
    </div>
  `,
  styles: [`
    .page-container { padding: 1.5rem; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
    .page-title { font-size: 1.5rem; font-weight: 600; margin: 0; }
    .page-subtitle { color: #6b7280; margin: 0.25rem 0 0; }
    .header-actions { display: flex; gap: 0.75rem; }
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
    .btn-sm { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; border-radius: 6px; padding: 0.3rem 0.75rem; cursor: pointer; font-size: 0.8rem; }
    .group-card { margin-bottom: 1rem; }
    .group-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
    .group-title { font-size: 1rem; font-weight: 600; margin: 0 0 0.25rem; }
    .current-rate { font-size: 0.875rem; color: #374151; }
    .no-rate { font-size: 0.875rem; color: #ef4444; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th, .data-table td { padding: 0.6rem 0.75rem; text-align: left; border-bottom: 1px solid #f3f4f6; font-size: 0.875rem; }
    .data-table th { font-weight: 600; color: #374151; background: #f9fafb; }
    .badge-active { background: #d1fae5; color: #065f46; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.75rem; }
    .badge-inactive { background: #f3f4f6; color: #6b7280; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.75rem; }
    .alert { padding: 0.75rem 1rem; border-radius: 6px; margin-bottom: 1rem; }
    .alert-error { background: #fee2e2; color: #991b1b; }
    .alert-success { background: #d1fae5; color: #065f46; }
    .loading-state, .empty-group { text-align: center; color: #9ca3af; padding: 1rem; }
    .btn-icon-edit, .btn-icon-delete { background: none; border: none; cursor: pointer; padding: 0.25rem; }
  `]
})
export class StatutoryRatesComponent implements OnInit, OnDestroy {

  rates: StatutoryRate[] = [];
  rateGroups: RateGroup[] = [];
  loading = false;
  saving = false;
  showAll = false;
  editMode = false;
  selectedRate?: StatutoryRate;

  form!: FormGroup;
  errorMessage = '';
  successMessage = '';

  private destroy$ = new Subject<void>();

  readonly RATE_CODES = [
    { code: 'CNSS_EMPLOYEE', label: 'CNSS — Part Salarié (%)' },
    { code: 'CNSS_EMPLOYER', label: 'CNSS — Part Patronale (%)' },
    { code: 'AMO_EMPLOYEE',  label: 'AMO — Part Salarié (%)'  },
    { code: 'AMO_EMPLOYER',  label: 'AMO — Part Patronale (%)' },
    { code: 'CIMR_EMPLOYEE', label: 'CIMR — Part Salarié (%)' },
    { code: 'CIMR_EMPLOYER', label: 'CIMR — Part Patronale (%)' },
  ];

  constructor(private payrollSvc: PayrollService, private fb: FormBuilder) {}

  ngOnInit(): void {
    this.buildForm();
    this.loadRates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      code:          ['', Validators.required],
      label:         ['', Validators.required],
      rate:          [null, [Validators.required, Validators.min(0), Validators.max(1)]],
      ceiling:       [null],
      effectiveFrom: ['', Validators.required],
      effectiveTo:   [''],
    });
  }

  loadRates(): void {
    this.loading = true;
    this.payrollSvc.getStatutoryRates()
      .pipe(takeUntil(this.destroy$), finalize(() => this.loading = false))
      .subscribe({
        next: (rates: StatutoryRate[]) => {
          // If showAll is false, filter to only active rates
          this.rates = this.showAll ? rates : rates.filter((r: StatutoryRate) => r.isActive);
          this.buildRateGroups(this.showAll ? rates : rates);
        },
        error: (err: Error) => { this.errorMessage = err.message; }
      });
  }

  private buildRateGroups(rates: StatutoryRate[]): void {
    const grouped = new Map<string, StatutoryRate[]>();
    for (const r of rates) {
      if (!grouped.has(r.code)) grouped.set(r.code, []);
      grouped.get(r.code)!.push(r);
    }
    this.rateGroups = this.RATE_CODES.map(rc => {
      const history = (grouped.get(rc.code) ?? []).sort(
        (a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime()
      );
      return {
        code: rc.code,
        label: rc.label,
        rates: history,
        currentRate: history.find(r => r.isActive)
      };
    });
  }

  openCreate(): void {
    this.selectedRate = undefined;
    this.editMode = true;
    this.form.reset({ effectiveFrom: new Date().toISOString().substring(0, 10) });
  }

  openCreateForCode(code: string, label: string): void {
    this.selectedRate = undefined;
    this.editMode = true;
    this.form.reset({ code, label, effectiveFrom: new Date().toISOString().substring(0, 10) });
  }

  openEdit(rate: StatutoryRate): void {
    this.selectedRate = rate;
    this.editMode = true;
    this.form.patchValue({
      code:          rate.code,
      label:         rate.label,
      rate:          rate.rate,
      ceiling:       rate.ceiling ?? null,
      effectiveFrom: new Date(rate.effectiveFrom).toISOString().substring(0, 10),
      effectiveTo:   rate.effectiveTo ? new Date(rate.effectiveTo).toISOString().substring(0, 10) : ''
    });
  }

  cancel(): void {
    this.editMode = false;
    this.selectedRate = undefined;
    this.form.reset();
    this.errorMessage = '';
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    this.errorMessage = '';
    const payload: Partial<StatutoryRate> = { ...this.form.value };
    if (!payload.ceiling) payload.ceiling = undefined;
    if (!payload.effectiveTo) payload.effectiveTo = undefined;

    const obs = this.selectedRate
      ? this.payrollSvc.updateStatutoryRate(this.selectedRate.id, payload)
      : this.payrollSvc.createStatutoryRate(payload);

    obs.pipe(takeUntil(this.destroy$), finalize(() => this.saving = false))
      .subscribe({
        next: () => {
          this.successMessage = this.selectedRate ? 'Taux mis à jour.' : 'Taux créé.';
          this.editMode = false;
          this.loadRates();
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (err: Error) => { this.errorMessage = err.message; }
      });
  }

  delete(rate: StatutoryRate): void {
    if (!confirm(`Supprimer le taux ${rate.label} ?`)) return;
    this.payrollSvc.deleteStatutoryRate(rate.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.loadRates(),
        error: (err: Error) => { this.errorMessage = err.message; }
      });
  }

  toggleShowAll(): void {
    this.showAll = !this.showAll;
    this.loadRates();
  }
}