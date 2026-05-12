import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PayrollPeriodService, CompanyService } from '../../../core/services/domain.services';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  PayrollPeriod, CreatePayrollPeriodPayload,
  Company, PAYROLL_PERIOD_TYPE_OPTIONS, PayrollPeriodType,
} from '../../../core/models';

const MONTH_NAMES_FR = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
];

@Component({
  selector: 'app-periods',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './periods.component.html',
  styleUrls: ['./periods.component.scss'],
})
export class PeriodsComponent implements OnInit {
  items: PayrollPeriod[] = [];
  filtered: PayrollPeriod[] = [];
  companies: Company[] = [];
  loading = true;

  /** Modal création */
  showModal = false;
  saving = false;
  apiError = '';

  /** Modal clôture */
  showCloseModal = false;
  closingPeriod: PayrollPeriod | null = null;
  closing = false;
  closeResult: { closed: PayrollPeriod; opened: PayrollPeriod | null; message: string } | null = null;

  search = '';

  /** Période OPEN actuelle de l'entreprise */
  openPeriod: PayrollPeriod | null = null;
  checkingOpen = false;

  readonly typeOptions = PAYROLL_PERIOD_TYPE_OPTIONS;
  readonly monthNames = MONTH_NAMES_FR;
  readonly years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i - 1);

  form: { companyId: string; year: number; month: number; type: PayrollPeriodType; notes: string } = {
    companyId: '',
    year:  new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    type:  'MONTHLY',
    notes: '',
  };

  constructor(
    private service: PayrollPeriodService,
    private companyService: CompanyService,
    private auth: AuthService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    if (this.isSuperAdmin) {
      this.loadCompanies();
    }
    this.load();
  }

  loadCompanies() {
    this.companyService.getAll().subscribe({ next: (data) => { this.companies = data; this.cdr.detectChanges(); } });
  }

  load() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (data) => {
        this.items = data;
        this.applySearch();
        this.loading = false;
        // Mettre à jour la période OPEN connue
        const companyId = this.currentCompanyId;
        if (companyId) {
          this.openPeriod = data.find(p => p.companyId === companyId && p.status === 'OPEN') ?? null;
        }
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); },
    });
  }

  applySearch() {
    const q = this.search.toLowerCase();
    this.filtered = this.items.filter(i =>
      !q ||
      `${i.year} ${this.monthLabel(i.month)} ${i.status} ${this.formatPeriodType(i.type)}`
        .toLowerCase().includes(q)
    );
  }

  onSearch() { this.applySearch(); }

  // ─── Getters ──────────────────────────────────────────────────────────────

  get isSuperAdmin(): boolean { return this.auth.isSuperAdmin(); }

  get currentCompanyId(): string { return this.auth.currentUser()?.companyId ?? ''; }

  get currentCompanyName(): string {
    return this.companies.find(c => c.id === this.currentCompanyId)?.name ?? 'Votre entreprise';
  }

  /** Période OPEN de l'entreprise actuellement active dans le formulaire */
  get formCompanyOpenPeriod(): PayrollPeriod | null {
    const cid = this.isSuperAdmin ? this.form.companyId : this.currentCompanyId;
    if (!cid) return null;
    return this.items.find(p => p.companyId === cid && p.status === 'OPEN') ?? null;
  }

  // ─── Création ─────────────────────────────────────────────────────────────

  openCreate() {
    this.form = {
      companyId: this.isSuperAdmin ? '' : this.currentCompanyId,
      year:  new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      type:  'MONTHLY',
      notes: '',
    };
    this.apiError = '';
    this.showModal = true;
    this.cdr.detectChanges();
  }

  /** Vérifie la règle "1 seule OPEN" avant d'afficher le modal */
  checkAndOpenCreate() {
    const cid = this.isSuperAdmin ? '' : this.currentCompanyId;

    // Pour les non-superadmin, on vérifie immédiatement
    if (!this.isSuperAdmin && cid) {
      const existing = this.items.find(p => p.companyId === cid && p.status === 'OPEN');
      if (existing) {
        const mn = this.monthLabel(existing.month);
        this.toastService.error(
          `Impossible de créer une nouvelle période : la période ${mn} ${existing.year} est encore OUVERTE. Clôturez-la d'abord.`
        );
        return;
      }
    }
    this.openCreate();
  }

  /** Quand le superadmin change l'entreprise dans le formulaire */
  onFormCompanyChange() {
    this.apiError = '';
    const existing = this.formCompanyOpenPeriod;
    if (existing) {
      this.apiError =
        `⚠️ ${this.getCompanyName(existing.companyId)} a déjà une période OPEN : ` +
        `${this.monthLabel(existing.month)} ${existing.year}. ` +
        `Clôturez-la avant de créer une nouvelle.`;
    }
    this.cdr.detectChanges();
  }

  save() {
    if (!this.form.companyId && !this.isSuperAdmin) {
      this.form.companyId = this.currentCompanyId;
    }
    if (!this.form.companyId) {
      this.apiError = 'Veuillez sélectionner une entreprise.';
      return;
    }

    // Vérification locale avant l'appel API
    const existing = this.formCompanyOpenPeriod;
    if (existing) {
      this.apiError =
        `Une période OPEN existe déjà pour ${this.monthLabel(existing.month)} ${existing.year}. ` +
        `Clôturez-la avant d'en créer une nouvelle.`;
      return;
    }

    // Vérifier doublon (même mois/année)
    const duplicate = this.items.find(
      p => p.companyId === this.form.companyId &&
           p.year === this.form.year &&
           p.month === this.form.month
    );
    if (duplicate) {
      this.apiError =
        `Une période existe déjà pour ${this.monthLabel(this.form.month)} ${this.form.year} ` +
        `(statut : ${duplicate.status}).`;
      return;
    }

    this.saving = true;
    this.apiError = '';

    const payload: CreatePayrollPeriodPayload = {
      companyId: this.form.companyId,
      year:  this.form.year,
      month: this.form.month,
      type:  this.form.type,
      startDate: '',  // calculé côté serveur
      endDate: '',    // calculé côté serveur
      notes: this.form.notes || undefined,
    } as any;

    const loadingId = this.toastService.loading('Création de la période en cours...');

    this.service.create(payload).subscribe({
      next: (created) => {
        this.saving = false;
        this.showModal = false;
        this.load();
        this.toastService.update(
          loadingId,
          `Période ${this.monthLabel(created.month)} ${created.year} créée. ` +
          `La période suivante a été préparée automatiquement.`,
          'success', 5000
        );
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.saving = false;
        this.apiError = this.formatApiError(e);
        if (loadingId) this.toastService.update(loadingId, this.apiError, 'error', 5000);
        this.cdr.detectChanges();
      },
    });
  }

  // ─── Clôture ──────────────────────────────────────────────────────────────

  openCloseModal(period: PayrollPeriod) {
    this.closingPeriod = period;
    this.closeResult = null;
    this.showCloseModal = true;
    this.cdr.detectChanges();
  }

  confirmClose() {
    if (!this.closingPeriod) return;
    this.closing = true;
    const loadingId = this.toastService.loading('Clôture en cours...');

    this.service.closePeriod(this.closingPeriod.id).subscribe({
      next: (result) => {
        this.closing = false;
        this.closeResult = result;
        this.load();
        this.toastService.update(loadingId, result.message, 'success', 6000);
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.closing = false;
        const msg = this.formatApiError(e);
        this.toastService.update(loadingId, msg, 'error', 5000);
        this.showCloseModal = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ─── Suppression ──────────────────────────────────────────────────────────

  delete(period: PayrollPeriod) {
    if (period.status === 'OPEN') {
      this.toastService.error('Impossible de supprimer une période OPEN. Clôturez-la d\'abord.');
      return;
    }
    if (!confirm(`Supprimer la période ${this.monthLabel(period.month)} ${period.year} ?`)) return;

    this.service.delete(period.id).subscribe({
      next: () => { this.load(); this.toastService.success('Période supprimée.'); this.cdr.detectChanges(); },
      error: (e) => { this.toastService.error(this.formatApiError(e)); this.cdr.detectChanges(); },
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  formatPeriodType(t: PayrollPeriodType | undefined | null): string {
    const map: Record<PayrollPeriodType, string> = {
      MONTHLY: 'Mensuel', WEEKLY: 'Hebdomadaire', CUSTOM: 'Personnalisé',
    };
    return map[t ?? 'MONTHLY'] ?? (t || 'MONTHLY');
  }

  monthLabel(m: number): string {
    return MONTH_NAMES_FR[(m ?? 1) - 1] ?? String(m);
  }

  getCompanyName(id: string): string {
    return this.companies.find(c => c.id === id)?.name ?? id;
  }

  statusClass(s: string): string {
    const m: Record<string, string> = {
      OPEN: 'badge-success', PROCESSING: 'badge-warning',
      CLOSED: 'badge-secondary', LOCKED: 'badge-danger',
    };
    return m[s] ?? 'badge-secondary';
  }

  formatApiError(e: any): string {
    const err = e?.error;
    if (!err) return 'Erreur serveur.';
    let msg = err.error || err.message || 'Erreur serveur.';
    if (err.code === 'OPEN_PERIOD_EXISTS') {
      msg = `⚠️ ${msg}`;
    } else if (err.code === 'DUPLICATE_PERIOD') {
      msg = `⛔ ${msg}`;
    }
    return msg;
  }

  nextPeriodLabel(period: PayrollPeriod | null): string {
    if (!period) return '';
    const m = period.month === 12 ? 1 : period.month + 1;
    const y = period.month === 12 ? period.year + 1 : period.year;
    return `${MONTH_NAMES_FR[m - 1]} ${y}`;
  }

  close()      { this.showModal = false; this.cdr.detectChanges(); }
  closeModal() { this.showCloseModal = false; this.closingPeriod = null; this.closeResult = null; this.cdr.detectChanges(); }
}