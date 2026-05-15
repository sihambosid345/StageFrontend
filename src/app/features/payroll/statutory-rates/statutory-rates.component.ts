// ============================================================
// statutory-rates.component.ts
// Gestion des taux réglementaires (CNSS, AMO) — CRUD + historique
// ============================================================
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { PayrollApiService } from '../../services/payroll-api.service';
import { StatutoryRate } from '../../models/payroll.models';

interface RateGroup {
  code: string;
  label: string;
  rates: StatutoryRate[];
  currentRate?: StatutoryRate;
}

@Component({
  selector: 'app-statutory-rates',
  templateUrl: './statutory-rates.component.html',
  styleUrls: ['./statutory-rates.component.scss']
})
export class StatutoryRatesComponent implements OnInit, OnDestroy {

  rates: StatutoryRate[] = [];
  rateGroups: RateGroup[] = [];
  loading = false;
  saving = false;
  showAll = false;         // toggle : actifs seuls / historique complet
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
    { code: 'CIMR_EMPLOYER', label: 'CIMR — Part Patronale (%)'},
  ];

  constructor(
    private api: PayrollApiService,
    private fb: FormBuilder
  ) {}

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
      rate:          [null, [Validators.required, Validators.min(0), Validators.max(100)]],
      ceiling:       [null],
      effectiveFrom: ['', Validators.required],
      effectiveTo:   [''],
    });
  }

  loadRates(): void {
    this.loading = true;
    this.api.getStatutoryRates(!this.showAll)
      .pipe(takeUntil(this.destroy$), finalize(() => this.loading = false))
      .subscribe({
        next: rates => {
          this.rates = rates;
          this.buildRateGroups(rates);
        },
        error: err => this.errorMessage = err.message
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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.errorMessage = '';
    const payload = this.form.value;

    const obs = this.selectedRate
      ? this.api.updateStatutoryRate(this.selectedRate.id, payload)
      : this.api.createStatutoryRate(payload);

    obs.pipe(takeUntil(this.destroy$), finalize(() => this.saving = false))
      .subscribe({
        next: () => {
          this.successMessage = this.selectedRate ? 'Taux mis à jour.' : 'Taux créé.';
          this.editMode = false;
          this.loadRates();
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: err => this.errorMessage = err.message
      });
  }

  deactivate(rate: StatutoryRate): void {
    if (!confirm(`Désactiver le taux ${rate.label} ?`)) return;
    this.api.deactivateStatutoryRate(rate.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.loadRates(),
        error: err => this.errorMessage = err.message
      });
  }

  toggleShowAll(): void {
    this.showAll = !this.showAll;
    this.loadRates();
  }

  getVersionBadge(rate: StatutoryRate): string {
    return `v${rate.version}`;
  }
}