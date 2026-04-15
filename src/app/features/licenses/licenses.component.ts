import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LicenseService, CompanyService } from '../../core/services/domain.services';
import { AuthService } from '../../core/services/auth.service';
import {
  License, Company,
  LicensePlanCode, LicenseStatus, BillingCycle,
} from '../../core/models';

type FormErrors = Record<string, string>;

const LICENSE_PLAN_OPTIONS: LicensePlanCode[]   = ['BASIC', 'PRO', 'BUSINESS', 'ENTERPRISE'];
const LICENSE_STATUS_OPTIONS: LicenseStatus[]   = ['TRIAL', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED'];
const BILLING_CYCLE_OPTIONS: BillingCycle[]     = ['MONTHLY', 'YEARLY', 'LIFETIME'];

function validateRequired(form: any, fields: string[]): FormErrors {
  const errors: FormErrors = {};
  for (const f of fields) {
    if (!form[f] || form[f] === '') errors[f] = 'Ce champ est requis.';
  }
  return errors;
}

@Component({
  selector: 'app-licenses',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './licenses.component.html',
  styleUrls: ['./licenses.component.scss']
})
export class LicensesComponent implements OnInit {
  items: License[]   = [];
  filtered: License[] = [];
  companies: Company[] = [];   // ✅ liste des entreprises pour le dropdown
  loading    = true;
  showModal  = false;
  editing    = false;
  editingId  = '';
  search     = '';
  errors: FormErrors = {};

  readonly planOptions    = LICENSE_PLAN_OPTIONS;
  readonly statusOptions  = LICENSE_STATUS_OPTIONS;
  readonly billingOptions = BILLING_CYCLE_OPTIONS;

  form: any = this.emptyForm();

  constructor(
    private service: LicenseService,
    private companyService: CompanyService,
    private auth: AuthService,
  ) {}

  ngOnInit() {
    this.load();
    this.loadCompanies();
  }

  // ✅ charge les entreprises pour le select
  loadCompanies() {
    this.companyService.getAll().subscribe({
      next: (data) => { this.companies = data; },
      error: () => {}
    });
  }

  // ✅ helper — retourne le nom d'une entreprise par son id
  companyName(id: string): string {
    return this.companies.find(c => c.id === id)?.name ?? id;
  }

  load() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (data) => { this.items = data; this.filtered = data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  onSearch() {
    const q = this.search.toLowerCase();
    this.filtered = this.items.filter(i =>
      `${this.companyName(i.companyId)} ${i.planCode} ${i.status} ${i.billingCycle}`
        .toLowerCase().includes(q)
    );
  }

  get isSuperAdmin(): boolean {
    return this.auth.isSuperAdmin();
  }

  get currentCompanyId(): string {
    return this.auth.currentUser()?.companyId ?? '';
  }

  get currentCompanyName(): string {
    const companyId = this.currentCompanyId;
    return this.companies.find(c => c.id === companyId)?.name ?? 'Entreprise assignée automatiquement';
  }

  openCreate() {
    this.form = this.emptyForm();
    if (!this.isSuperAdmin) {
      this.form.companyId = this.currentCompanyId;
    }
    this.editing = false; this.editingId = ''; this.errors = {};
    this.showModal = true;
  }

  openEdit(item: License) {
    this.form = {
      companyId:       item.companyId,
      planCode:        item.planCode,
      status:          item.status,
      billingCycle:    item.billingCycle,
      startsAt:        item.startsAt?.slice(0, 10) ?? '',
      endsAt:          item.endsAt?.slice(0, 10) ?? '',
      maxUsers:        item.maxUsers ?? null,
      maxEmployees:    item.maxEmployees ?? null,
      maxStorageMb:    item.maxStorageMb ?? null,
      payrollEnabled:  item.payrollEnabled,
      rhEnabled:       item.rhEnabled,
      cnssEnabled:     item.cnssEnabled,
      taxEnabled:      item.taxEnabled,
      damancomEnabled: item.damancomEnabled,
      notes:           item.notes ?? '',
    };
    this.editing = true; this.editingId = item.id; this.errors = {};
    this.showModal = true;
  }

  save() {
    if (!this.isSuperAdmin) {
      this.form.companyId = this.currentCompanyId;
    }

    this.errors = validateRequired(this.form, ['companyId', 'planCode', 'startsAt']);
    if (Object.keys(this.errors).length) return;

    const obs = this.editing
      ? this.service.update(this.editingId, this.form)
      : this.service.create(this.form);

    obs.subscribe({
      next: () => { this.showModal = false; this.load(); },
      error: (e: any) => { this.errors['api'] = e?.error?.error || 'Erreur serveur'; }
    });
  }

  delete(id: string) {
    if (!confirm('Supprimer cette licence ?')) return;
    this.service.delete(id).subscribe(() => this.load());
  }

  close()              { this.showModal = false; }
  hasError(f: string)  { return !!this.errors[f]; }

  // Helper methods for styling
  getPlanBadgeClass(planCode: string): string {
    const classes: Record<string, string> = {
      'BASIC': 'bg-secondary',
      'PRO': 'bg-info',
      'BUSINESS': 'bg-warning text-dark',
      'ENTERPRISE': 'bg-danger'
    };
    return classes[planCode] || 'bg-secondary';
  }

  getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      'TRIAL': 'bg-warning text-dark',
      'ACTIVE': 'bg-success',
      'EXPIRED': 'bg-danger',
      'SUSPENDED': 'bg-secondary',
      'CANCELLED': 'bg-dark'
    };
    return classes[status] || 'bg-secondary';
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      'TRIAL': 'bi-clock',
      'ACTIVE': 'bi-check-circle-fill',
      'EXPIRED': 'bi-x-circle-fill',
      'SUSPENDED': 'bi-pause-circle-fill',
      'CANCELLED': 'bi-x-octagon-fill'
    };
    return icons[status] || 'bi-question-circle';
  }

  private emptyForm(): any {
    return {
      companyId: '', planCode: 'BASIC', status: 'TRIAL',
      billingCycle: 'MONTHLY', startsAt: '', endsAt: '',
      maxUsers: null, maxEmployees: null, maxStorageMb: null,
      payrollEnabled: true, rhEnabled: true,
      cnssEnabled: false, taxEnabled: false, damancomEnabled: false,
      notes: '',
    };
  }
}