// ============================================================
// statutory-rates.component.ts
// SUPER_ADMIN : sélecteur d'entreprise dans le formulaire + filtre
// ADMIN / Utilisateur : voit uniquement les données de sa propre entreprise
// ============================================================
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { PayrollService, StatutoryRate } from '../../../core/services/payroll-config.service';
import { AuthService } from '../../../core/services/auth.service';
import { CompanyService } from '../../../core/services/domain.services';
import { Company } from '../../../core/models';

interface RateGroup {
  code: string;
  label: string;
  rates: StatutoryRate[];
  currentRate?: StatutoryRate;
}

@Component({
  selector: 'app-statutory-rates',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DecimalPipe, DatePipe],
  templateUrl: './statutory-rates.component.html',
  styles: [`
    .pr-page { padding: 1.5rem; }
    .pr-page__header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
    .pr-page__title { font-size: 1.5rem; font-weight: 700; margin: 0; }
    .pr-page__subtitle { color: #6b7280; margin: 0.25rem 0 0; font-size: 0.875rem; }
    .pr-page__actions { display: flex; gap: 0.75rem; align-items: center; }
    .btn { display: inline-flex; align-items: center; gap: 0.4rem; border: none; border-radius: 6px; padding: 0.5rem 1rem; cursor: pointer; font-size: 0.875rem; font-weight: 500; transition: all .15s; }
    .btn--primary { background: #4f46e5; color: white; }
    .btn--primary:hover { background: #4338ca; }
    .btn--primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn--ghost { background: white; color: #374151; border: 1px solid #d1d5db; }
    .btn--ghost:hover { background: #f9fafb; }
    .btn--danger { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
    .btn--xs { padding: 0.25rem 0.6rem; font-size: 0.75rem; }
    .btn--sm { padding: 0.35rem 0.75rem; font-size: 0.8rem; }
    .icon { font-size: 1rem; }
    .alert { padding: 0.75rem 1rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.875rem; }
    .alert--success { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }
    .alert--error { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
    .pr-loading { display: flex; align-items: center; gap: 0.75rem; padding: 2rem; color: #6b7280; }
    .pr-loading__spinner { width: 20px; height: 20px; border: 2px solid #e5e7eb; border-top-color: #4f46e5; border-radius: 50%; animation: spin .7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .rate-groups { display: grid; gap: 1rem; }
    .rate-group { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1.25rem; }
    .rate-group__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
    .rate-group__info { display: flex; flex-direction: column; gap: 0.2rem; }
    .rate-group__code { font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: .05em; }
    .rate-group__label { font-size: 0.9rem; font-weight: 600; color: #111827; }
    .rate-group__current { display: flex; align-items: center; gap: 0.5rem; }
    .rate-group__actions { display: flex; gap: 0.5rem; margin-bottom: 0.5rem; }
    .rate-badge { padding: 0.25rem 0.6rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600; }
    .rate-badge--active { background: #d1fae5; color: #065f46; }
    .rate-badge--inactive { background: #f3f4f6; color: #6b7280; }
    .rate-ceiling { font-size: 0.8rem; color: #6b7280; }
    .rate-history { margin-top: 0.75rem; border-top: 1px solid #f3f4f6; padding-top: 0.75rem; }
    .rate-history__title { font-size: 0.75rem; font-weight: 600; color: #9ca3af; text-transform: uppercase; margin-bottom: 0.5rem; }
    .pr-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    .pr-table th, .pr-table td { padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid #f3f4f6; }
    .pr-table th { font-weight: 600; color: #374151; background: #f9fafb; }
    .pr-table--compact th, .pr-table--compact td { padding: 0.35rem 0.5rem; }
    .row--active { background: #f0fdf4; }
    .version-badge { background: #ede9fe; color: #5b21b6; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.7rem; font-weight: 600; }
    .status-chip { padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.75rem; font-weight: 500; }
    .status-chip--active { background: #d1fae5; color: #065f46; }
    .status-chip--inactive { background: #f3f4f6; color: #6b7280; }
    .pr-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100; }
    .pr-modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%); background: white; border-radius: 12px; width: min(560px, 95vw); max-height: 90vh; overflow-y: auto; z-index: 101; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
    .pr-modal__header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid #e5e7eb; }
    .pr-modal__header h2 { margin: 0; font-size: 1.1rem; font-weight: 700; }
    .btn-close { background: none; border: none; font-size: 1.25rem; cursor: pointer; color: #6b7280; padding: 0.25rem; line-height: 1; }
    .pr-form { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
    .pr-form__row { display: grid; gap: 1rem; }
    .pr-form__row--2 { grid-template-columns: 1fr 1fr; }
    .pr-form__field { display: flex; flex-direction: column; gap: 0.35rem; }
    .pr-form__field label { font-size: 0.8rem; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: .04em; }
    .pr-form__field input, .pr-form__field select { border: 1px solid #d1d5db; border-radius: 6px; padding: 0.5rem 0.75rem; font-size: 0.9rem; outline: none; transition: border-color .15s; }
    .pr-form__field input:focus, .pr-form__field select:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,.1); }
    .pr-form__field input.invalid, .pr-form__field select.invalid { border-color: #ef4444; }
    .pr-form__field small { font-size: 0.75rem; color: #9ca3af; }
    .pr-form__error { font-size: 0.75rem; color: #ef4444; }
    .pr-modal__footer { display: flex; justify-content: flex-end; gap: 0.75rem; padding: 1rem 1.5rem; border-top: 1px solid #e5e7eb; }
    .spinner-sm { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.4); border-top-color: white; border-radius: 50%; animation: spin .7s linear infinite; display: inline-block; }
    /* Super Admin UI */
    .company-filter-bar { display: flex; align-items: center; gap: 0.75rem; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1rem; font-size: 0.875rem; flex-wrap: wrap; }
    .company-filter-bar label { font-weight: 600; color: #1e40af; white-space: nowrap; }
    .company-filter-bar select { border: 1px solid #93c5fd; border-radius: 6px; padding: 0.35rem 0.65rem; font-size: 0.875rem; color: #1e3a8a; background: white; flex: 1; min-width: 200px; max-width: 320px; }
    .company-field { background: #f5f3ff; border-radius: 8px; padding: 1rem; border: 1px solid #c4b5fd; }
    .company-field label { color: #5b21b6 !important; }
    .company-field select { border-color: #7c3aed !important; }
    .company-field select:focus { border-color: #7c3aed !important; box-shadow: 0 0 0 3px rgba(124,58,237,.15) !important; }
    .sa-badge { display: inline-flex; align-items: center; gap: 0.3rem; background: #ede9fe; color: #5b21b6; border-radius: 4px; padding: 0.15rem 0.5rem; font-size: 0.7rem; font-weight: 700; letter-spacing: .05em; }
  `]
})
export class StatutoryRatesComponent implements OnInit, OnDestroy {

  rates: StatutoryRate[] = [];
  rateGroups: RateGroup[] = [];
  loading = false;
  saving = false;
  seeding = false;
  showAll = false;
  editMode = false;
  selectedRate?: StatutoryRate;
  errorMessage = '';
  successMessage = '';

  isSuperAdmin = false;
  companies: Company[] = [];
  selectedFilterCompanyId: string | null = null;

  form!: FormGroup;
  private destroy$ = new Subject<void>();

  readonly RATE_CODES = [
    { code: 'CNSS_EMPLOYEE',    label: 'CNSS — Part Salarié' },
    { code: 'CNSS_EMPLOYER',    label: 'CNSS — Part Patronale' },
    { code: 'AMO_EMPLOYEE',     label: 'AMO — Part Salarié'  },
    { code: 'AMO_EMPLOYER',     label: 'AMO — Part Patronale' },
    { code: 'CIMR_EMPLOYEE',    label: 'CIMR — Part Salarié' },
    { code: 'CIMR_EMPLOYER',    label: 'CIMR — Part Patronale' },
    { code: 'TRAINING_TAX',     label: 'Taxe de Formation Professionnelle' },
    { code: 'FAMILY_ALLOWANCE', label: 'Allocations Familiales' },
    { code: 'SOCIAL_BENEFITS',  label: 'Prestations Sociales' },
  ];

  constructor(
    private payrollSvc: PayrollService,
    private fb: FormBuilder,
    private auth: AuthService,
    private companySvc: CompanyService
  ) {}

  ngOnInit(): void {
    this.isSuperAdmin = this.auth.isSuperAdmin();
    this.buildForm();
    if (this.isSuperAdmin) {
      this.companySvc.getAll()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (companies) => { this.companies = companies; this.loadRates(); },
          error: () => this.loadRates()
        });
    } else {
      this.loadRates();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      companyId:     [null],
      code:          ['', Validators.required],
      label:         ['', Validators.required],
      rate:          [null, [Validators.required, Validators.min(0), Validators.max(100)]],
      ceiling:       [null],
      effectiveFrom: ['', Validators.required],
      effectiveTo:   [''],
      isActive:      [true],
    });
  }

  onFilterCompanyChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedFilterCompanyId = val || null;
    this.loadRates();
  }

  loadRates(): void {
    this.loading = true;
    this.errorMessage = '';
    const companyId = this.isSuperAdmin ? (this.selectedFilterCompanyId ?? undefined) : undefined;
    this.payrollSvc.getStatutoryRates(undefined, companyId)
      .pipe(takeUntil(this.destroy$), finalize(() => this.loading = false))
      .subscribe({
        next: (rates: StatutoryRate[]) => this.buildRateGroups(rates),
        error: (err: Error) => { this.errorMessage = err.message; }
      });
  }

  private buildRateGroups(allRates: StatutoryRate[]): void {
    const grouped = new Map<string, StatutoryRate[]>();
    for (const r of allRates) {
      if (!grouped.has(r.code)) grouped.set(r.code, []);
      grouped.get(r.code)!.push(r);
    }
    this.rateGroups = this.RATE_CODES.map(rc => {
      const history = (grouped.get(rc.code) ?? []).sort(
        (a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime()
      );
      const filtered = this.showAll ? history : history.filter(r => r.isActive);
      return { code: rc.code, label: rc.label, rates: filtered, currentRate: history.find(r => r.isActive) };
    });
  }

  getVersionBadge(r: StatutoryRate): string { return `v${r.version ?? 1}`; }

  getCompanyName(companyId: string | null | undefined): string {
    if (!companyId) return '—';
    return this.companies.find(c => c.id === companyId)?.name ?? companyId;
  }

  openCreate(): void {
    this.selectedRate = undefined;
    this.editMode = true;
    this.errorMessage = '';
    this.form.reset({
      companyId:     this.isSuperAdmin ? (this.selectedFilterCompanyId ?? null) : null,
      effectiveFrom: new Date().toISOString().substring(0, 10),
      isActive: true,
    });
  }

  openEdit(rate: StatutoryRate): void {
    this.selectedRate = rate;
    this.editMode = true;
    this.errorMessage = '';
    this.form.patchValue({
      companyId:     rate.companyId ?? null,
      code:          rate.code,
      label:         rate.label,
      rate:          +(rate.rate * 100).toFixed(4),
      ceiling:       rate.ceiling ?? null,
      effectiveFrom: new Date(rate.effectiveFrom).toISOString().substring(0, 10),
      effectiveTo:   rate.effectiveTo ? new Date(rate.effectiveTo).toISOString().substring(0, 10) : '',
      isActive:      rate.isActive,
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
    if (this.isSuperAdmin && !this.form.value.companyId) {
      this.errorMessage = 'Veuillez sélectionner une entreprise.';
      return;
    }
    this.saving = true;
    this.errorMessage = '';
    const v = this.form.value;
    const payload: any = {
      code:          v.code,
      label:         v.label,
      rate:          +(v.rate / 100).toFixed(6),
      ceiling:       v.ceiling || undefined,
      effectiveFrom: v.effectiveFrom,
      effectiveTo:   v.effectiveTo || undefined,
      isActive:      v.isActive ?? true,
    };
    if (this.isSuperAdmin && v.companyId) { payload.companyId = v.companyId; }

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

  deactivate(rate: StatutoryRate): void {
    if (!confirm(`Désactiver le taux "${rate.label}" ?`)) return;
    this.payrollSvc.deleteStatutoryRate(rate.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.successMessage = 'Taux désactivé.'; this.loadRates(); },
        error: (err: Error) => { this.errorMessage = err.message; }
      });
  }

  seedRates(): void {
    if (!confirm('Initialiser les taux légaux marocains 2026 ? Les taux existants ne seront pas écrasés.')) return;
    this.seeding = true;
    this.payrollSvc.seedStatutoryRates()
      .pipe(takeUntil(this.destroy$), finalize(() => this.seeding = false))
      .subscribe({
        next: (res) => {
          this.successMessage = res.message;
          this.loadRates();
          setTimeout(() => this.successMessage = '', 4000);
        },
        error: (err: Error) => { this.errorMessage = err.message; }
      });
  }

  toggleShowAll(): void { this.showAll = !this.showAll; this.loadRates(); }
}