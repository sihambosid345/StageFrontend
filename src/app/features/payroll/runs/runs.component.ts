import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PayrollRunService, PayrollPeriodService, PayrollCalculationService } from '../../../core/services/domain.services';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { PAYROLL_RUN_STATUS_OPTIONS, PayrollRunResult } from '../../../core/models';

@Component({
  selector: 'app-runs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './runs.component.html',
  styleUrls: ['./runs.component.scss']
})
export class RunsComponent implements OnInit {
  items:    any[] = [];
  filtered: any[] = [];
  periods:  any[] = [];
  loading   = true;
  showModal = false;
  editing   = false;
  editingId = '';
  search    = '';
  error     = '';

  // Correction 7 : résultat du calcul moteur
  calculatingRunId: string | null = null;
  lastResult: PayrollRunResult | null = null;
  showResultModal = false;

  readonly statusOptions = PAYROLL_RUN_STATUS_OPTIONS;

  form: any = {
    payrollPeriodId: '',
    status: 'DRAFT',
    runNumber: 1,
    notes: ''
  };

  constructor(
    private service: PayrollRunService,
    private periodService: PayrollPeriodService,
    private calculationService: PayrollCalculationService,
    private auth: AuthService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    requestAnimationFrame(() => {
      this.load();
      this.periodService.getAll().subscribe({
        next: (d) => this.ngZone.run(() => { this.periods = d; this.cdr.detectChanges(); }),
        error: () => {}
      });
    });
  }

  load() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (data) => this.ngZone.run(() => {
        this.items = data;
        this.applySearch();
        this.loading = false;
        this.cdr.detectChanges();
      }),
      error: () => this.ngZone.run(() => { this.loading = false; this.cdr.detectChanges(); })
    });
  }

  applySearch() {
    const q = this.search.toLowerCase();
    this.filtered = q
      ? this.items.filter(i =>
          this.getPeriodLabel(i.payrollPeriodId).toLowerCase().includes(q) ||
          i.status?.toLowerCase().includes(q)
        )
      : [...this.items];
    this.cdr.markForCheck();
  }

  onSearch() { this.applySearch(); }

  getPeriodLabel(id: string): string {
    const p = this.periods.find(p => p.id === id);
    return p ? `${p.month}/${p.year}` : id;
  }

  openCreate() {
    this.form     = { payrollPeriodId: '', status: 'DRAFT', runNumber: 1, notes: '' };
    this.editing  = false;
    this.editingId = '';
    this.error    = '';
    this.showModal = true;
  }

  openEdit(item: any) {
    // Correction 8 : interdire l'édition d'un run COMPLETED
    if (item.status === 'COMPLETED') {
      this.toast.error('Ce run est terminé. Créez un nouveau run pour recalculer.');
      return;
    }
    this.form = {
      payrollPeriodId: item.payrollPeriodId,
      status:    item.status,
      runNumber: item.runNumber ?? 1,
      notes:     item.notes ?? ''
    };
    this.editing   = true;
    this.editingId = item.id;
    this.error     = '';
    this.showModal = true;
  }

  save() {
    if (!this.form.payrollPeriodId) {
      this.error = 'La période de paie est obligatoire.';
      return;
    }
    const selectedPeriod = this.periods.find(p => p.id === this.form.payrollPeriodId);
    if (!selectedPeriod?.companyId) {
      this.error = 'Période invalide ou sans entreprise associée.';
      return;
    }

    const payload: any = {
      companyId:       selectedPeriod.companyId,
      payrollPeriodId: this.form.payrollPeriodId,
      status:          this.form.status,
      runNumber:       +this.form.runNumber || 1,
    };
    if (this.form.notes) payload.notes = this.form.notes;

    const obs = this.editing
      ? this.service.update(this.editingId, payload)
      : this.service.create(payload);

    obs.subscribe({
      next: () => this.ngZone.run(() => { this.showModal = false; this.load(); }),
      error: (e) => this.ngZone.run(() => {
        this.error = e?.error?.error || 'Erreur serveur';
        this.cdr.detectChanges();
      })
    });
  }

  // ── Correction 7 : lancer le moteur de paie ──────────────────────────────
  /**
   * Déclenche POST /payroll-calculation/run/:id
   * Le backend exécute tout dans une transaction Prisma.
   */
  calculate(item: any) {
    // Correction 8 : bloquer si déjà COMPLETED
    if (item.status === 'COMPLETED') {
      this.toast.error('Ce run est déjà terminé. Créez un nouveau run pour recalculer.');
      return;
    }
    if (!confirm(`Lancer le calcul de paie pour le run #${item.runNumber} ?`)) return;

    this.calculatingRunId = item.id;
    const toastId = this.toast.loading('Calcul en cours...');
    this.cdr.detectChanges();

    this.calculationService.calculate(item.id).subscribe({
      next: (result) => this.ngZone.run(() => {
        this.calculatingRunId = null;
        this.lastResult       = result;
        this.showResultModal  = true;
        this.load(); // rafraîchir les totaux

        const msg = `Calcul terminé : ${result.processed}/${result.totalEmployees} employé(s)${result.errors > 0 ? ` — ${result.errors} erreur(s)` : ''}`;
        this.toast.update(toastId, msg, result.errors > 0 ? 'warning' : 'success', 6000);
        this.cdr.detectChanges();
      }),
      error: (e) => this.ngZone.run(() => {
        this.calculatingRunId = null;
        const msg = e?.error?.message || e?.error?.error || 'Erreur lors du calcul';
        this.toast.update(toastId, msg, 'error', 6000);
        this.cdr.detectChanges();
      })
    });
  }

  closeResultModal() {
    this.showResultModal = false;
    this.lastResult      = null;
    this.cdr.detectChanges();
  }

  delete(id: string) {
    const item = this.items.find(i => i.id === id);
    if (item?.status === 'COMPLETED') {
      this.toast.error('Impossible de supprimer un run terminé.');
      return;
    }
    if (!confirm('Supprimer cette exécution ?')) return;
    this.service.delete(id).subscribe(() => this.ngZone.run(() => this.load()));
  }

  close() { this.showModal = false; this.cdr.detectChanges(); }

  statusClass(s: string): string {
    const m: any = {
      DRAFT:      'badge-secondary',
      PROCESSING: 'badge-warning',
      COMPLETED:  'badge-success',
      CANCELLED:  'badge-danger'
    };
    return m[s] ?? 'badge-secondary';
  }

  isCalculating(id: string): boolean {
    return this.calculatingRunId === id;
  }
}