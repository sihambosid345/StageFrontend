// ============================================================
// tax-brackets.component.ts
// Barème IR progressif — CRUD par exercice fiscal
// ============================================================
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { PayrollApiService } from '../../services/payroll-api.service';
import { TaxBracket } from '../../models/payroll.models';

@Component({
  selector: 'app-tax-brackets',
  templateUrl: './tax-brackets.component.html',
  styleUrls: ['./tax-brackets.component.scss']
})
export class TaxBracketsComponent implements OnInit, OnDestroy {

  brackets: TaxBracket[] = [];
  availableYears: number[] = [];
  selectedYear: number = new Date().getFullYear();

  loading = false;
  saving = false;
  editMode = false;
  selectedBracket?: TaxBracket;

  form!: FormGroup;
  errorMessage = '';
  successMessage = '';

  private destroy$ = new Subject<void>();

  constructor(private api: PayrollApiService, private fb: FormBuilder) {}

  ngOnInit(): void {
    this.buildYears();
    this.buildForm();
    this.loadBrackets();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildYears(): void {
    const y = new Date().getFullYear();
    this.availableYears = [y - 1, y, y + 1];
  }

  private buildForm(): void {
    this.form = this.fb.group({
      periodYear:     [this.selectedYear, Validators.required],
      minIncome:      [null, [Validators.required, Validators.min(0)]],
      maxIncome:      [null],
      rate:           [null, [Validators.required, Validators.min(0), Validators.max(100)]],
      fixedDeduction: [0, [Validators.required, Validators.min(0)]],
      effectiveFrom:  ['', Validators.required],
      effectiveTo:    [''],
    });
  }

  loadBrackets(): void {
    this.loading = true;
    this.api.getTaxBrackets(this.selectedYear)
      .pipe(takeUntil(this.destroy$), finalize(() => this.loading = false))
      .subscribe({
        next: brackets => {
          this.brackets = brackets.sort((a, b) => a.minIncome - b.minIncome);
        },
        error: err => this.errorMessage = err.message
      });
  }

  onYearChange(year: number): void {
    this.selectedYear = year;
    this.loadBrackets();
  }

  openCreate(): void {
    this.selectedBracket = undefined;
    this.editMode = true;
    this.form.reset({
      periodYear: this.selectedYear,
      fixedDeduction: 0,
      effectiveFrom: new Date().toISOString().substring(0, 10)
    });
  }

  openEdit(bracket: TaxBracket): void {
    this.selectedBracket = bracket;
    this.editMode = true;
    this.form.patchValue({
      periodYear:     bracket.periodYear,
      minIncome:      bracket.minIncome,
      maxIncome:      bracket.maxIncome ?? null,
      rate:           bracket.rate,
      fixedDeduction: bracket.fixedDeduction,
      effectiveFrom:  new Date(bracket.effectiveFrom).toISOString().substring(0, 10),
      effectiveTo:    bracket.effectiveTo ? new Date(bracket.effectiveTo).toISOString().substring(0, 10) : ''
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
    const payload = this.form.value;
    if (!payload.maxIncome) payload.maxIncome = null;

    const obs = this.selectedBracket
      ? this.api.updateTaxBracket(this.selectedBracket.id, payload)
      : this.api.createTaxBracket(payload);

    obs.pipe(takeUntil(this.destroy$), finalize(() => this.saving = false))
      .subscribe({
        next: () => {
          this.successMessage = 'Tranche sauvegardée.';
          this.editMode = false;
          this.loadBrackets();
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: err => this.errorMessage = err.message
      });
  }

  delete(bracket: TaxBracket): void {
    if (!confirm(`Supprimer la tranche ${bracket.minIncome} — ${bracket.maxIncome ?? '∞'} ?`)) return;
    this.api.deleteTaxBracket(bracket.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: () => this.loadBrackets(), error: err => this.errorMessage = err.message });
  }

  /**
   * Simule l'IR sur un salaire test
   */
  simulationSalary = 0;
  simulatedIR = 0;

  simulateIR(): void {
    if (!this.simulationSalary) return;
    let tax = 0;
    let remaining = this.simulationSalary;
    for (const b of this.brackets) {
      if (remaining <= 0 || this.simulationSalary < b.minIncome) break;
      const top = b.maxIncome ?? Infinity;
      const slice = Math.min(remaining, top - b.minIncome);
      tax += slice * (b.rate / 100) - (b.fixedDeduction / 12);
      remaining -= slice;
    }
    this.simulatedIR = Math.max(0, tax);
  }

  formatRange(b: TaxBracket): string {
    const max = b.maxIncome ? (b.maxIncome | 0).toLocaleString('fr-MA') + ' MAD' : '∞';
    return `${b.minIncome.toLocaleString('fr-MA')} — ${max}`;
  }
}