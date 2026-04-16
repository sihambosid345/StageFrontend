import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SuperAdminService, CompanyService, LicenseService, UserService } from '../../core/services/domain.services';
import { AuthService } from '../../core/services/auth.service';
import {
  Company, License, User,
  COMPANY_STATUS_OPTIONS, FormErrors, validateRequired,
  LICENSE_PLAN_OPTIONS, LICENSE_STATUS_OPTIONS, BILLING_CYCLE_OPTIONS,
  LicensePlanCode, LicenseStatus, BillingCycle,
} from '../../core/models';

type ModalMode = 'company' | 'license' | 'users' | 'admin';

@Component({
  selector: 'app-companies',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './companies.component.html',
  styleUrls: ['./companies.component.scss']
})
export class CompaniesComponent implements OnInit {
  // ── Data ──────────────────────────────────────────────────────────────────
  items:    any[]     = [];   // companies enrichies (avec license + _count)
  filtered: any[]     = [];
  loading   = true;
  search    = '';
  toast     = '';
  toastTimer: any;
  errors: FormErrors = {};

  // ── Modal control ─────────────────────────────────────────────────────────
  modalMode: ModalMode | null = null;
  editing   = false;
  editingId = '';
  selectedCompany: any = null;

  // ── Options ───────────────────────────────────────────────────────────────
  readonly statusOptions   = COMPANY_STATUS_OPTIONS;
  readonly planOptions     = LICENSE_PLAN_OPTIONS as LicensePlanCode[];
  readonly licStatusOptions = LICENSE_STATUS_OPTIONS as LicenseStatus[];
  readonly billingOptions  = BILLING_CYCLE_OPTIONS as BillingCycle[];

  // ── Forms ─────────────────────────────────────────────────────────────────
  companyForm: Partial<Company> = this.emptyCompanyForm();
  licenseForm: any              = this.emptyLicenseForm();
  adminForm: any                = this.emptyAdminForm();

  // ── Users panel ───────────────────────────────────────────────────────────
  companyUsers: User[] = [];
  usersLoading = false;

  constructor(
    private superAdminSvc: SuperAdminService,
    private companySvc:    CompanyService,
    private licenseSvc:    LicenseService,
    private userSvc:       UserService,
    public  auth:          AuthService,
  ) {}

  ngOnInit() { this.load(); }

  // ── Load ──────────────────────────────────────────────────────────────────
  load() {
    this.loading = true;
    if (this.auth.isSuperAdmin()) {
      this.superAdminSvc.getAllCompanies().subscribe({
        next: (res) => {
          this.items    = res.companies;
          this.filtered = res.companies;
          this.loading  = false;
        },
        error: () => { this.loading = false; }
      });
    } else {
      this.companySvc.getAll().subscribe({
        next: (data) => { this.items = data; this.filtered = data; this.loading = false; },
        error: () => { this.loading = false; }
      });
    }
  }

  onSearch() {
    const q = this.search.toLowerCase();
    this.filtered = q
      ? this.items.filter(i =>
          `${i.name} ${i.legalName ?? ''} ${i.email ?? ''} ${i.city ?? ''}`.toLowerCase().includes(q)
        )
      : [...this.items];
  }

  // ── Getters ───────────────────────────────────────────────────────────────
  get isSuperAdmin(): boolean { return this.auth.isSuperAdmin(); }

  getLicenseStatus(company: any): string {
    return company.license?.status ?? '—';
  }

  getLicensePlan(company: any): string {
    return company.license?.planCode ?? '—';
  }

  getLicenseExpiry(company: any): string {
    if (!company.license?.endsAt) return 'Illimité';
    return new Date(company.license.endsAt).toLocaleDateString('fr-MA');
  }

  getUsersCount(company: any): number {
    return company._count?.users ?? 0;
  }

  getLicenseStatusClass(company: any): string {
    const s = company.license?.status;
    if (!s) return 'badge-warning';
    const map: Record<string, string> = {
      ACTIVE:    'badge-success',
      TRIAL:     'badge-warning',
      EXPIRED:   'badge-danger',
      SUSPENDED: 'badge-secondary',
      CANCELLED: 'badge-dark',
    };
    return map[s] ?? 'badge-secondary';
  }

  getStatusClass(status: string): string {
    if (status === 'ACTIVE')    return 'badge-success';
    if (status === 'INACTIVE')  return 'badge-warning';
    if (status === 'SUSPENDED') return 'badge-danger';
    return 'badge-secondary';
  }

  // ── Modals ────────────────────────────────────────────────────────────────

  // 1️⃣  Créer une nouvelle entreprise
  openCreate() {
    this.companyForm  = this.emptyCompanyForm();
    this.editing      = false;
    this.editingId    = '';
    this.errors       = {};
    this.modalMode    = 'company';
  }

  // 2️⃣  Modifier une entreprise existante
  openEdit(item: any) {
    this.companyForm = {
      name:          item.name,
      legalName:     item.legalName     ?? '',
      taxIdentifier: item.taxIdentifier ?? '',
      rcNumber:      item.rcNumber      ?? '',
      iceNumber:     item.iceNumber     ?? '',
      cnssNumber:    item.cnssNumber    ?? '',
      email:         item.email         ?? '',
      phone:         item.phone         ?? '',
      address:       item.address       ?? '',
      city:          item.city          ?? '',
      country:       item.country       ?? 'Maroc',
      timezone:      item.timezone      ?? 'Africa/Casablanca',
      currency:      item.currency      ?? 'MAD',
      status:        item.status,
    };
    this.editing   = true;
    this.editingId = item.id;
    this.errors    = {};
    this.modalMode = 'company';
  }

  // 3️⃣  Gérer la licence d'une entreprise
  openLicense(item: any) {
    this.selectedCompany = item;
    const lic = item.license;
    this.licenseForm = lic ? {
      companyId:       item.id,
      planCode:        lic.planCode,
      status:          lic.status,
      billingCycle:    lic.billingCycle,
      startsAt:        lic.startsAt?.slice(0, 10) ?? '',
      endsAt:          lic.endsAt?.slice(0, 10)   ?? '',
      maxUsers:        lic.maxUsers        ?? null,
      maxEmployees:    lic.maxEmployees    ?? null,
      maxStorageMb:    lic.maxStorageMb    ?? null,
      payrollEnabled:  lic.payrollEnabled  ?? true,
      rhEnabled:       lic.rhEnabled       ?? true,
      cnssEnabled:     lic.cnssEnabled     ?? false,
      taxEnabled:      lic.taxEnabled      ?? false,
      damancomEnabled: lic.damancomEnabled ?? false,
      notes:           lic.notes           ?? '',
    } : {
      ...this.emptyLicenseForm(),
      companyId: item.id,
    };
    this.errors    = {};
    this.modalMode = 'license';
  }

  // 4️⃣  Voir les utilisateurs d'une entreprise
  openUsers(item: any) {
    this.selectedCompany = item;
    this.companyUsers    = [];
    this.usersLoading    = true;
    this.modalMode       = 'users';
    this.superAdminSvc.getCompanyUsers(item.id).subscribe({
      next:  (res) => { this.companyUsers = res.users; this.usersLoading = false; },
      error: ()    => { this.usersLoading = false; }
    });
  }

  // 5️⃣  Créer un admin pour une entreprise
  openCreateAdmin(item: any) {
    this.selectedCompany = item;
    this.adminForm       = this.emptyAdminForm();
    this.errors          = {};
    this.modalMode       = 'admin';
  }

  // ── Save actions ──────────────────────────────────────────────────────────

  saveCompany() {
    this.errors = validateRequired(this.companyForm as any, ['name']);
    if (Object.keys(this.errors).length) return;

    if (this.editing) {
      // Modifier via route standard
      this.companySvc.update(this.editingId, this.companyForm).subscribe({
        next: () => { this.close(); this.load(); this.showToast('Entreprise modifiée.'); },
        error: (e) => { this.errors['api'] = e?.error?.error || 'Erreur serveur'; }
      });
    } else {
      // Créer via super-admin (crée company + licence TRIAL automatiquement)
      this.superAdminSvc.createCompanyWithLicense(this.companyForm).subscribe({
        next: (res) => {
          this.close();
          this.load();
          this.showToast(`Entreprise "${res.company.name}" créée avec une licence d'essai de 30 jours.`);
        },
        error: (e) => { this.errors['api'] = e?.error?.error || 'Erreur serveur'; }
      });
    }
  }

  saveLicense() {
    this.errors = validateRequired(this.licenseForm, ['companyId', 'planCode', 'startsAt']);
    if (Object.keys(this.errors).length) return;

    this.superAdminSvc.createOrUpdateLicense(this.licenseForm).subscribe({
      next: (res) => {
        this.close();
        this.load();
        this.showToast(res.message || 'Licence enregistrée.');
      },
      error: (e) => { this.errors['api'] = e?.error?.error || 'Erreur serveur'; }
    });
  }

  saveAdmin() {
    this.errors = validateRequired(this.adminForm, ['firstName', 'lastName', 'email', 'password']);
    if (Object.keys(this.errors).length) return;

    if (this.adminForm.password?.length < 6) {
      this.errors['password'] = 'Mot de passe trop court (min. 6 caractères).';
      return;
    }

    const payload = { ...this.adminForm, companyId: this.selectedCompany.id };
    this.superAdminSvc.createCompanyAdmin(payload).subscribe({
      next: (res) => {
        this.close();
        this.showToast(`Admin "${res.user.firstName} ${res.user.lastName}" créé.`);
      },
      error: (e) => { this.errors['api'] = e?.error?.error || 'Erreur serveur'; }
    });
  }

  deleteCompany(id: string, name: string) {
    if (!confirm(`Supprimer l'entreprise "${name}" ? Cette action est irréversible.`)) return;
    this.companySvc.delete(id).subscribe({
      next: () => { this.load(); this.showToast('Entreprise supprimée.'); },
      error: (e) => alert(e?.error?.error || 'Erreur lors de la suppression.')
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  close() { this.modalMode = null; this.selectedCompany = null; this.errors = {}; }

  hasError(f: string) { return !!this.errors[f]; }

  showToast(msg: string) {
    this.toast = msg;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast = '', 4000);
  }

  generatePassword() {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#';
    let pw = '';
    for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    this.adminForm.password = pw;
  }

  getRoleClass(role: string): string {
    const map: Record<string, string> = {
      SUPER_ADMIN: 'badge-danger',
      ADMIN:       'badge-primary',
      HR_MANAGER:  'badge-info',
      PAYROLL_MANAGER: 'badge-warning',
      EMPLOYEE:    'badge-secondary',
      VIEWER:      'badge-light',
    };
    return map[role] ?? 'badge-secondary';
  }

  // ── Empty forms ───────────────────────────────────────────────────────────
  private emptyCompanyForm(): Partial<Company> {
    return {
      name: '', legalName: '', taxIdentifier: '', rcNumber: '',
      iceNumber: '', cnssNumber: '', email: '', phone: '',
      address: '', city: '', country: 'Maroc',
      timezone: 'Africa/Casablanca', currency: 'MAD', status: 'ACTIVE',
    };
  }

  private emptyLicenseForm(): any {
    return {
      companyId: '', planCode: 'BASIC', status: 'ACTIVE',
      billingCycle: 'MONTHLY', startsAt: '', endsAt: '',
      maxUsers: null, maxEmployees: null, maxStorageMb: null,
      payrollEnabled: true, rhEnabled: true,
      cnssEnabled: false, taxEnabled: false, damancomEnabled: false,
      notes: '',
    };
  }

  private emptyAdminForm(): any {
    return { firstName: '', lastName: '', email: '', phone: '', password: '' };
  }
}