import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { LicenseService, CompanyService, SuperAdminService } from '../../core/services/domain.services';
import { AuthService } from '../../core/services/auth.service';
import {
  License, Company,
  LicensePlanCode, LicenseStatus, BillingCycle,
} from '../../core/models';
import { ToastService } from '../../core/services/toast.service';

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
  items: License[] = [];
  filtered: License[] = [];
  companies: Company[] = [];
  loading = true;
  showModal = false;
  editing = false;
  editingId = '';
  search = '';
  companyFilterId = '';
  statusFilter = '';
  planFilter = '';
  showFilterPanel = false;
  pendingCompanyId = '';
  pendingStatus = '';
  pendingPlan = '';
  errors: FormErrors = {};
  queryCompanyId = '';

  readonly planOptions = LICENSE_PLAN_OPTIONS;
  readonly statusOptions = LICENSE_STATUS_OPTIONS;
  readonly billingOptions = BILLING_CYCLE_OPTIONS;

  form: any = this.emptyForm();

  constructor(
    private service: LicenseService,
    private companyService: CompanyService,
    private superAdminService: SuperAdminService,
    public auth: AuthService,
    private route: ActivatedRoute,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.load();
    this.loadCompanies();
    this.route.queryParamMap.subscribe(params => {
      const companyId = params.get('companyId');
      if (companyId) {
        this.queryCompanyId = companyId;
        this.openCreate();
      }
    });
    // Auto-refresh every 30 seconds
    setInterval(() => {
      if (!this.showModal && !this.showFilterPanel) {
        this.load();
      }
    }, 30000);
  }

  loadCompanies() {
    this.companyService.getAll().subscribe({
      next: (data) => { 
        this.companies = data || []; 
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading companies:', err);
        this.cdr.detectChanges();
      }
    });
  }

  companyName(id: string): string {
    const company = this.companies.find(c => c.id === id);
    return company?.name ?? id;
  }

  load() {
    this.loading = true;
    console.log('🔄 Loading licenses...');
    
    this.service.getAll().subscribe({
      next: (data) => { 
        console.log('✅ Licenses loaded:', data?.length || 0);
        this.items = this.updateExpiredLicenses(data || []); 
        this.applyFilters(); 
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Error loading licenses:', err);
        this.loading = false;
        this.items = [];
        this.filtered = [];
        this.cdr.detectChanges();
        this.toastService?.error('Erreur lors du chargement des licences');
      }
    });
  }

  /**
   * Vérifie et met à jour le statut des licences expirées
   */
  private updateExpiredLicenses(licenses: License[]): License[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return licenses.map(license => {
      if (license.endsAt && license.status !== 'EXPIRED' && license.status !== 'CANCELLED') {
        const endDate = new Date(license.endsAt);
        endDate.setHours(0, 0, 0, 0);
        
        if (endDate < today) {
          this.updateLicenseStatus(license.id, 'EXPIRED');
          return { ...license, status: 'EXPIRED' };
        }
      }
      return license;
    });
  }

  /**
   * Met à jour le statut d'une licence dans la base de données
   */
  private updateLicenseStatus(licenseId: string, newStatus: LicenseStatus) {
    this.service.update(licenseId, { status: newStatus }).subscribe({
      next: () => {
        console.log(`✅ Licence ${licenseId} mise à jour: ${newStatus}`);
      },
      error: (err) => {
        console.error(`❌ Erreur mise à jour licence ${licenseId}:`, err);
      }
    });
  }

  onSearch() {
    this.applyFilters();
  }

  applyFilters() {
    const q = this.search.toLowerCase();
    this.filtered = this.items.filter(i => {
      const matchesSearch = `${this.companyName(i.companyId)} ${i.planCode} ${i.status} ${i.billingCycle}`
        .toLowerCase().includes(q);
      const matchesCompany = this.companyFilterId ? i.companyId === this.companyFilterId : true;
      const matchesStatus = this.statusFilter ? i.status === this.statusFilter : true;
      const matchesPlan = this.planFilter ? i.planCode === this.planFilter : true;
      return matchesSearch && matchesCompany && matchesStatus && matchesPlan;
    });
    console.log(`🔍 Filtered licenses: ${this.filtered.length} / ${this.items.length}`);
    this.cdr.detectChanges();
  }

  clearCompanyFilter() {
    this.companyFilterId = '';
    this.applyFilters();
  }

  clearStatusFilter() {
    this.statusFilter = '';
    this.applyFilters();
  }

  clearPlanFilter() {
    this.planFilter = '';
    this.applyFilters();
  }

  openFilterPanel() {
    this.pendingCompanyId = this.companyFilterId;
    this.pendingStatus = this.statusFilter;
    this.pendingPlan = this.planFilter;
    this.showFilterPanel = true;
  }

  closeFilterPanel() {
    this.showFilterPanel = false;
    this.cdr.detectChanges();
  }

  togglePendingCompanySelection(companyId: string) {
    this.pendingCompanyId = this.pendingCompanyId === companyId ? '' : companyId;
    this.cdr.detectChanges();
  }

  isPendingCompanySelected(companyId: string): boolean {
    return this.pendingCompanyId === companyId;
  }

  togglePendingStatusSelection(status: LicenseStatus) {
    this.pendingStatus = this.pendingStatus === status ? '' : status;
    this.cdr.detectChanges();
  }

  isPendingStatusSelected(status: LicenseStatus): boolean {
    return this.pendingStatus === status;
  }

  togglePendingPlanSelection(plan: LicensePlanCode) {
    this.pendingPlan = this.pendingPlan === plan ? '' : plan;
    this.cdr.detectChanges();
  }

  isPendingPlanSelected(plan: LicensePlanCode): boolean {
    return this.pendingPlan === plan;
  }

  applyPendingFilters() {
    this.companyFilterId = this.pendingCompanyId;
    this.statusFilter = this.pendingStatus;
    this.planFilter = this.pendingPlan;
    this.applyFilters();
    this.showFilterPanel = false;
    this.cdr.detectChanges();
  }

  resetPendingFilters() {
    this.pendingCompanyId = '';
    this.pendingStatus = '';
    this.pendingPlan = '';
    this.cdr.detectChanges();
  }

  get isSuperAdmin(): boolean { 
    return this.auth.isSuperAdmin(); 
  }
  
  get currentCompanyId(): string { 
    return this.auth.currentUser()?.companyId ?? ''; 
  }
  
  get currentCompanyName(): string {
    const id = this.currentCompanyId;
    const company = this.companies.find(c => c.id === id);
    return company?.name ?? 'Entreprise assignée automatiquement';
  }

  openCreate() {
    this.form = this.emptyForm();
    if (this.queryCompanyId && this.isSuperAdmin) {
      this.form.companyId = this.queryCompanyId;
    }
    if (!this.isSuperAdmin) {
      this.form.companyId = this.currentCompanyId;
    }
    this.editing = false; 
    this.editingId = ''; 
    this.errors = {};
    this.showModal = true;
    this.cdr.detectChanges();
  }

  openEdit(item: License) {
    this.form = {
      companyId:       item.companyId,
      planCode:        item.planCode,
      status:          item.status,
      billingCycle:    item.billingCycle,
      startsAt:        item.startsAt?.slice(0, 10) ?? '',
      endsAt:          item.endsAt?.slice(0, 10)   ?? '',
      maxUsers:        item.maxUsers        ?? null,
      maxEmployees:    item.maxEmployees    ?? null,
      maxStorageMb:    item.maxStorageMb    ?? null,
      payrollEnabled:  item.payrollEnabled,
      rhEnabled:       item.rhEnabled,
      cnssEnabled:     item.cnssEnabled,
      taxEnabled:      item.taxEnabled,
      damancomEnabled: item.damancomEnabled,
      notes:           item.notes ?? '',
    };
    this.editing = true; 
    this.editingId = item.id; 
    this.errors = {};
    this.showModal = true;
    this.cdr.detectChanges();
  }

  save() {
    if (!this.isSuperAdmin) {
      this.form.companyId = this.currentCompanyId;
    }

    this.errors = validateRequired(this.form, ['companyId', 'planCode', 'startsAt']);
    if (Object.keys(this.errors).length) {
      this.cdr.detectChanges();
      return;
    }

    const loadingId = this.toastService?.loading('Sauvegarde en cours...');
    
    const next = () => { 
      this.showModal = false; 
      this.load();
      this.cdr.detectChanges();
      if (this.toastService) {
        this.toastService.update(loadingId, this.editing ? 'Licence modifiée avec succès' : 'Licence créée avec succès', 'success', 4000);
      }
    };
    
    const error = (e: any) => { 
      this.errors['api'] = e?.error?.error || 'Erreur serveur';
      this.cdr.detectChanges();
      if (this.toastService) {
        this.toastService.update(loadingId, this.errors['api'], 'error', 4000);
      }
    };

    if (this.editing) {
      this.service.update(this.editingId, this.form).subscribe({ next, error });
    } else {
      this.superAdminService.createOrUpdateLicense(this.form).subscribe({ next, error });
    }
  }

  delete(id: string) {
    if (!confirm('Supprimer cette licence ?')) return;
    
    this.service.delete(id).subscribe({ 
      next: () => {
        this.load();
        this.toastService?.success('Licence supprimée avec succès');
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Delete error:', err);
        this.toastService?.error(err?.error?.error || 'Erreur lors de la suppression');
        this.cdr.detectChanges();
      }
    });
  }

  close() { 
    this.showModal = false; 
    this.cdr.detectChanges();
  }
  
  hasError(f: string) { 
    return !!this.errors[f]; 
  }

  getPlanBadgeClass(planCode: string): string {
    const map: Record<string, string> = {
      'BASIC': 'badge-secondary', 
      'PRO': 'badge-info',
      'BUSINESS': 'badge-warning', 
      'ENTERPRISE': 'badge-danger'
    };
    return map[planCode] || 'badge-secondary';
  }

  getStatusBadgeClass(status: string): string {
    const map: Record<string, string> = {
      'TRIAL': 'badge-warning', 
      'ACTIVE': 'badge-success',
      'EXPIRED': 'badge-danger', 
      'SUSPENDED': 'badge-secondary', 
      'CANCELLED': 'badge-dark'
    };
    return map[status] || 'badge-secondary';
  }

  getStatusIcon(status: string): string {
    const map: Record<string, string> = {
      'TRIAL': 'bi-clock', 
      'ACTIVE': 'bi-check-circle-fill',
      'EXPIRED': 'bi-x-circle-fill', 
      'SUSPENDED': 'bi-pause-circle-fill',
      'CANCELLED': 'bi-x-octagon-fill'
    };
    return map[status] || 'bi-question-circle';
  }

  private emptyForm(): any {
    return {
      companyId: '', 
      planCode: 'BASIC', 
      status: 'TRIAL',
      billingCycle: 'MONTHLY', 
      startsAt: '', 
      endsAt: '',
      maxUsers: null, 
      maxEmployees: null, 
      maxStorageMb: null,
      payrollEnabled: true, 
      rhEnabled: true,
      cnssEnabled: false, 
      taxEnabled: false, 
      damancomEnabled: false,
      notes: '',
    };
  }
}