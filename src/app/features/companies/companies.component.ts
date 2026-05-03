import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  CompanyService,
  LicenseService,
  UserService,
  SuperAdminService,
} from '../../core/services/domain.services';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import {
  Company,
  CreateCompanyPayload,
  UpdateCompanyPayload,
  CreateCompanyWithLicenseAndUsersPayload,
  CreateLicensePayload,
  CreateUserPayload,
  COMPANY_STATUS_OPTIONS,
  LICENSE_PLAN_OPTIONS,
  LICENSE_STATUS_OPTIONS,
  BILLING_CYCLE_OPTIONS,
  FormErrors,
  validateRequired,
} from '../../core/models';

@Component({
  selector: 'app-companies',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './companies.component.html',
  styleUrls: ['./companies.component.scss'],
})
export class CompaniesComponent implements OnInit {
  items: Company[] = [];
  filtered: Company[] = [];
  loading = true;
  showModal = false;
  editing = false;
  editingId = '';
  search = '';
  selectedCompanyIds: string[] = [];
  selectedStatuses: string[] = [];
  errors: FormErrors = {};
  createMode: 'simple' | 'combined' = 'combined';
  
  editModalTab: 'company' | 'license' | 'users' = 'company';
  editingLicense: any = null;
  editingUsers: any[] = [];
  newLicenseForm: any = null;

  selectedCompany?: Company;
  selectedLicense: any = null;
  selectedCompanyUsers: any[] = [];
  selectedEditableUser: any = null;
  userEditForm = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'ADMIN',
    status: 'ACTIVE',
  };
  showDetailsModal = false;
  activeDetailsTab: 'company' | 'license' | 'users' = 'company';
  detailEditSection: 'company' | 'license' | 'users' = 'company';

  readonly statusOptions = COMPANY_STATUS_OPTIONS;
  readonly planOptions = LICENSE_PLAN_OPTIONS;
  readonly licenseStatusOptions = LICENSE_STATUS_OPTIONS;
  readonly billingOptions = BILLING_CYCLE_OPTIONS;

  readonly USER_ROLES = ['ADMIN', 'HR_MANAGER', 'PAYROLL_MANAGER', 'EMPLOYEE', 'VIEWER'];
  readonly PERMISSIONS = [
    { key: 'dashboard', label: 'Tableau de bord' },
    { key: 'employees', label: 'Employés' },
    { key: 'payroll', label: 'Paie' },
    { key: 'organisation', label: 'Organisation' },
    { key: 'attendance', label: 'Présences' },
    { key: 'contracts', label: 'Contrats' },
    { key: 'reports', label: 'Rapports CNSS' },
    { key: 'licenses', label: 'Licences' },
    { key: 'users', label: 'Utilisateurs' },
  ];

  readonly ROLE_PRESETS: Record<string, string[]> = {
    ADMIN: [
      'dashboard',
      'employees',
      'organisation',
      'attendance',
      'contracts',
      'payroll',
      'reports',
      'licenses',
      'users',
    ],
    HR_MANAGER: ['dashboard', 'employees', 'attendance', 'contracts', 'reports', 'users'],
    PAYROLL_MANAGER: ['dashboard', 'payroll', 'attendance', 'users'],
    EMPLOYEE: ['dashboard', 'users'],
    VIEWER: ['dashboard', 'users'],
  };

  combinedForm: CreateCompanyWithLicenseAndUsersPayload = this.emptyCombinedForm();
  form: CreateCompanyPayload = this.emptyForm();

  showPassword: { [key: number]: boolean } = {};
  showFilterPanel = false;
  filterPanelTab: 'company' | 'status' = 'company';
  pendingCompanyIds: string[] = [];
  pendingStatuses: string[] = [];

  constructor(
    private service: CompanyService,
    private licenseService: LicenseService,
    private userService: UserService,
    private superAdminService: SuperAdminService,
    public auth: AuthService,
    private router: Router,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.load();
    setInterval(() => {
      if (!this.showModal && !this.showDetailsModal) {
        this.load();
      }
    }, 30000);
  }

  load() {
    this.loading = true;
    console.log('🔄 Loading companies...');
    
    this.service.getAll().subscribe({
      next: (data) => {
        console.log('✅ Companies loaded:', data?.length || 0);
        this.items = data || [];
        this.filtered = [...this.items];
        this.loading = false;
        this.cdr.detectChanges();
        this.applyFilters();
      },
      error: (err) => {
        console.error('❌ Error loading companies:', err);
        this.loading = false;
        this.items = [];
        this.filtered = [];
        this.cdr.detectChanges();
        this.toastService.error('Erreur lors du chargement des entreprises');
      }
    });
  }

  openFilterPanel() {
    this.pendingCompanyIds = [...this.selectedCompanyIds];
    this.pendingStatuses = [...this.selectedStatuses];
    this.showFilterPanel = true;
  }

  closeFilterPanel() {
    this.showFilterPanel = false;
  }

  setFilterPanelTab(tab: 'company' | 'status') {
    this.filterPanelTab = tab;
  }

  togglePendingCompanySelection(companyId: string) {
    const index = this.pendingCompanyIds.indexOf(companyId);
    index >= 0 ? this.pendingCompanyIds.splice(index, 1) : this.pendingCompanyIds.push(companyId);
  }

  isPendingCompanySelected(companyId: string): boolean {
    return this.pendingCompanyIds.includes(companyId);
  }

  togglePendingStatusSelection(status: string) {
    const index = this.pendingStatuses.indexOf(status);
    index >= 0 ? this.pendingStatuses.splice(index, 1) : this.pendingStatuses.push(status);
  }

  isPendingStatusSelected(status: string): boolean {
    return this.pendingStatuses.includes(status);
  }

  applyPendingFilters() {
    this.selectedCompanyIds = [...this.pendingCompanyIds];
    this.selectedStatuses = [...this.pendingStatuses];
    this.applyFilters();
    this.showFilterPanel = false;
  }

  resetPendingFilters() {
    this.pendingCompanyIds = [];
    this.pendingStatuses = [];
  }

  removeSelectedCompany(companyId: string) {
    const index = this.selectedCompanyIds.indexOf(companyId);
    if (index >= 0) {
      this.selectedCompanyIds.splice(index, 1);
      this.applyFilters();
    }
  }

  removeSelectedStatus(status: string) {
    const index = this.selectedStatuses.indexOf(status);
    if (index >= 0) {
      this.selectedStatuses.splice(index, 1);
      this.applyFilters();
    }
  }

  onSearch() {
    this.applyFilters();
  }

  applyFilters() {
    const q = this.search.toLowerCase();
    this.filtered = this.items.filter((item) => {
      const matchSearch =
        `${item.name} ${item.legalName ?? ''} ${item.email ?? ''} ${item.phone ?? ''} ${item.city ?? ''}`
          .toLowerCase()
          .includes(q);
      const matchCompany =
        this.selectedCompanyIds.length === 0 || this.selectedCompanyIds.includes(item.id);
      const matchStatus =
        this.selectedStatuses.length === 0 || this.selectedStatuses.includes(item.status);
      return matchSearch && matchCompany && matchStatus;
    });
    this.cdr.detectChanges();
  }

  openCreate() {
    this.createMode = 'combined';
    this.form = this.emptyForm();
    this.combinedForm = this.emptyCombinedForm();
    this.editing = false;
    this.editingId = '';
    this.errors = {};
    this.showModal = true;
  }

  openEdit(item: Company) {
    this.form = {
      name: item.name,
      legalName: item.legalName ?? '',
      taxIdentifier: item.taxIdentifier ?? '',
      rcNumber: item.rcNumber ?? '',
      iceNumber: item.iceNumber ?? '',
      cnssNumber: item.cnssNumber ?? '',
      email: item.email ?? '',
      phone: item.phone ?? '',
      address: item.address ?? '',
      city: item.city ?? '',
      country: item.country ?? 'Maroc',
      timezone: item.timezone ?? 'Africa/Casablanca',
      currency: item.currency ?? 'MAD',
      status: item.status,
    };
    
    this.editingId = item.id;
    this.editing = true;
    this.editModalTab = 'company';
    this.errors = {};
    this.showModal = true;
    
    this.licenseService.getByCompany(item.id).subscribe({
      next: (license) => {
        this.editingLicense = license;
        if (!license) {
          this.editingLicense = {
            planCode: 'BASIC',
            status: 'TRIAL',
            billingCycle: 'MONTHLY',
            startsAt: new Date().toISOString().split('T')[0],
            endsAt: '',
            maxUsers: undefined,
            maxEmployees: undefined,
            maxStorageMb: undefined,
            payrollEnabled: true,
            rhEnabled: true,
            cnssEnabled: false,
            taxEnabled: false,
            damancomEnabled: false,
            notes: '',
          };
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.editingLicense = null;
        this.cdr.detectChanges();
      }
    });
    
    this.superAdminService.getCompanyUsers(item.id).subscribe({
      next: (response) => {
        this.editingUsers = response.users || [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.editingUsers = [];
        this.cdr.detectChanges();
      }
    });
  }

  save() {
    if (this.editing) {
      if (this.editModalTab === 'license') {
        this.saveEditLicense();
        return;
      }
      if (this.editModalTab === 'users') {
        this.saveEditUsers();
        return;
      }

      this.errors = validateRequired(this.form as any, ['name']);
      if (Object.keys(this.errors).length) return;

      this.service.update(this.editingId, this.form as UpdateCompanyPayload).subscribe({
        next: () => {
          this.showModal = false;
          this.load();
          this.toastService.success('Entreprise modifiée avec succès');
          this.cdr.detectChanges();
        },
        error: (e: any) => {
          this.errors['api'] = e?.error?.error || 'Erreur serveur';
          this.toastService.error('Erreur lors de la modification');
          this.cdr.detectChanges();
        },
      });
    } else {
      if (this.createMode === 'simple') {
        this.errors = validateRequired(this.form as any, ['name']);
        if (Object.keys(this.errors).length) return;

        this.superAdminService.createCompany(this.form).subscribe({
          next: () => {
            this.showModal = false;
            this.load();
            this.toastService.success('Entreprise créée avec succès');
            this.cdr.detectChanges();
          },
          error: (e: any) => {
            this.errors['api'] = e?.error?.error || 'Erreur serveur';
            this.toastService.error('Erreur lors de la création');
            this.cdr.detectChanges();
          },
        });
      } else {
        this.errors = this.validateCombinedForm();
        if (Object.keys(this.errors).length) return;

        this.superAdminService.createCompanyWithLicenseAndUsers(this.combinedForm).subscribe({
          next: () => {
            this.showModal = false;
            this.load();
            this.toastService.success('Entreprise, licence et utilisateurs créés avec succès');
            this.cdr.detectChanges();
          },
          error: (e: any) => {
            this.errors['api'] = e?.error?.error || 'Erreur serveur';
            this.toastService.error('Erreur lors de la création');
            this.cdr.detectChanges();
          },
        });
      }
    }
  }

  delete(id: string) {
    if (!confirm('Supprimer cette entreprise ?')) return;
    this.service.delete(id).subscribe({
      next: () => {
        this.load();
        this.toastService.success('Entreprise supprimée');
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Delete error:', err);
        this.toastService.error(err?.error?.error || 'Erreur lors de la suppression');
        this.cdr.detectChanges();
      },
    });
  }

  viewDetails(company: Company) {
    this.selectedCompany = company;
    this.activeDetailsTab = 'company';
    this.detailEditSection = 'company';
    this.showDetailsModal = true;
    this.loadCompanyLicense(company.id);
    this.loadCompanyUsers(company.id);
  }

  loadCompanyLicense(companyId: string) {
    this.selectedLicense = null;
    this.licenseService.getByCompany(companyId).subscribe({
      next: (license) => {
        this.selectedLicense = license;
        this.cdr.detectChanges();
      },
      error: () => {
        this.selectedLicense = null;
        this.cdr.detectChanges();
      },
    });
  }

  loadCompanyUsers(companyId: string) {
    this.selectedCompanyUsers = [];
    this.superAdminService.getCompanyUsers(companyId).subscribe({
      next: (response) => {
        this.selectedCompanyUsers = response.users || [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.selectedCompanyUsers = [];
        this.cdr.detectChanges();
      },
    });
  }

  saveCompanyDetails() {
    if (!this.selectedCompany) return;

    const loadingId = this.toastService.loading('Modification en cours...');

    const payload: UpdateCompanyPayload = {
      name: this.selectedCompany.name ?? undefined,
      legalName: this.selectedCompany.legalName ?? undefined,
      taxIdentifier: this.selectedCompany.taxIdentifier ?? undefined,
      rcNumber: this.selectedCompany.rcNumber ?? undefined,
      iceNumber: this.selectedCompany.iceNumber ?? undefined,
      cnssNumber: this.selectedCompany.cnssNumber ?? undefined,
      email: this.selectedCompany.email ?? undefined,
      phone: this.selectedCompany.phone ?? undefined,
      address: this.selectedCompany.address ?? undefined,
      city: this.selectedCompany.city ?? undefined,
      country: this.selectedCompany.country ?? undefined,
      timezone: this.selectedCompany.timezone ?? undefined,
      currency: this.selectedCompany.currency ?? undefined,
      status: this.selectedCompany.status ?? undefined,
    };

    this.service.update(this.selectedCompany.id, payload).subscribe({
      next: () => {
        this.toastService.update(loadingId, 'Entreprise modifiée avec succès', 'success', 4000);
        this.detailEditSection = '' as any;
        this.load();
        this.cdr.detectChanges();
      },
      error: (e: any) => {
        this.toastService.update(loadingId, 'Erreur lors de la modification', 'error', 4000);
        this.errors['api'] = e?.error?.error || 'Erreur serveur';
        this.cdr.detectChanges();
      },
    });
  }

  saveLicenseDetails() {
    if (!this.selectedCompany) return;

    const loadingId = this.toastService.loading('Modification de la licence en cours...');

    const payload = {
      ...(this.selectedLicense || {}),
      companyId: this.selectedCompany.id,
    };

    const onNext = () => {
      this.toastService.update(loadingId, 'Licence mise à jour avec succès', 'success', 4000);
      this.detailEditSection = '' as any;
      this.load();
      this.cdr.detectChanges();
    };
    const onError = (e: any) => {
      this.toastService.update(loadingId, 'Erreur lors de la mise à jour de la licence', 'error', 4000);
      this.errors['api'] = e?.error?.error || 'Erreur serveur';
      this.cdr.detectChanges();
    };

    if (this.selectedLicense?.id) {
      this.licenseService.update(this.selectedLicense.id, payload).subscribe({ next: onNext, error: onError });
    } else {
      this.licenseService.create(payload).subscribe({ next: onNext, error: onError });
    }
  }

  saveEditLicense() {
    if (!this.editingLicense || !this.editingId) return;

    const loadingId = this.toastService.loading('Modification de la licence en cours...');

    const payload = {
      ...this.editingLicense,
      companyId: this.editingId,
    };

    const onNext = () => {
      this.toastService.update(loadingId, 'Licence mise à jour avec succès', 'success', 4000);
      this.load();
      this.cdr.detectChanges();
    };
    const onError = (e: any) => {
      this.toastService.update(loadingId, 'Erreur lors de la mise à jour de la licence', 'error', 4000);
      this.errors['api'] = e?.error?.error || 'Erreur serveur';
      this.cdr.detectChanges();
    };

    if (this.editingLicense.id) {
      this.licenseService.update(this.editingLicense.id, payload).subscribe({ next: onNext, error: onError });
    } else {
      this.licenseService.create(payload).subscribe({ next: onNext, error: onError });
    }
  }

  addEditUser() {
    this.editingUsers.push({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      phone: '',
      role: 'ADMIN',
      status: 'ACTIVE',
      permissions: [
        'dashboard',
        'employees',
        'organisation',
        'attendance',
        'contracts',
        'payroll',
        'reports',
        'users',
      ],
    });
    this.cdr.detectChanges();
  }

  removeEditUser(index: number) {
    if (this.editingUsers.length > 0) {
      this.editingUsers.splice(index, 1);
      this.cdr.detectChanges();
    }
  }

  saveEditUsers() {
    if (!this.editingId) return;

    const loadingId = this.toastService.loading('Modification des utilisateurs en cours...');
    
    const validUsers = this.editingUsers.filter((user) => {
      const requiredOk = user.firstName?.trim() && user.lastName?.trim() && user.email?.trim();
      const passwordOk = user.id ? true : !!user.password?.trim();
      return requiredOk && passwordOk;
    });

    if (validUsers.length === 0) {
      this.toastService.update(loadingId, 'Aucun utilisateur valide à sauvegarder...', 'error', 5000);
      return;
    }

    let completed = 0;
    const total = validUsers.length;

    validUsers.forEach(user => {
      const payload = { ...user, companyId: this.editingId };
      const onComplete = () => {
        completed++;
        if (completed === total) {
          this.toastService.update(loadingId, 'Utilisateurs sauvegardés avec succès', 'success', 4000);
          this.load();
          this.cdr.detectChanges();
        }
      };
      const onFail = () => {
        completed++;
        if (completed === total) {
          this.toastService.update(loadingId, 'Erreur lors de la sauvegarde des utilisateurs', 'error', 4000);
          this.cdr.detectChanges();
        }
      };

      if (user.id) {
        this.userService.update(user.id, payload).subscribe({ next: onComplete, error: onFail });
      } else {
        this.userService.create(payload).subscribe({ next: onComplete, error: onFail });
      }
    });
  }

  cancelCompanyEdit() {
    this.detailEditSection = '' as any;
    this.toastService.success('Modifications annulées avec succès', 3000);
    this.cdr.detectChanges();
  }

  cancelLicenseEdit() {
    this.detailEditSection = '' as any;
    this.toastService.success('Modifications de la licence annulées avec succès', 3000);
    this.cdr.detectChanges();
  }

  onDetailsUsers() {
    if (!this.selectedCompany) return;
    this.activeDetailsTab = 'users';
  }

  editCompanyUser(user: any) {
    this.selectedEditableUser = user;
    this.userEditForm = {
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      email: user.email ?? '',
      phone: user.phone ?? '',
      role: user.role ?? 'ADMIN',
      status: user.status ?? 'ACTIVE',
    };
  }

  cancelUserEdit() {
    this.selectedEditableUser = null;
  }

  saveCompanyUser() {
    if (!this.selectedEditableUser) return;
    const payload: any = {
      firstName: this.userEditForm.firstName,
      lastName: this.userEditForm.lastName,
      email: this.userEditForm.email,
      phone: this.userEditForm.phone || undefined,
      role: this.userEditForm.role,
      status: this.userEditForm.status,
    };
    this.userService.update(this.selectedEditableUser.id, payload).subscribe({
      next: () => {
        if (this.selectedCompany) {
          this.loadCompanyUsers(this.selectedCompany.id);
        }
        this.toastService.success('Utilisateur modifié avec succès');
        this.selectedEditableUser = null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.toastService.error('Erreur lors de la modification de l’utilisateur');
        this.cdr.detectChanges();
      },
    });
  }

  deleteCompanyUser(user: any) {
    if (!confirm(`Supprimer ${user.firstName} ${user.lastName} ?`)) return;
    this.userService.delete(user.id).subscribe({
      next: () => {
        if (this.selectedCompany) {
          this.loadCompanyUsers(this.selectedCompany.id);
        }
        this.toastService.success('Utilisateur supprimé avec succès');
        this.cdr.detectChanges();
      },
      error: () => {
        this.toastService.error('Erreur lors de la suppression');
        this.cdr.detectChanges();
      },
    });
  }

  close() {
    this.showModal = false;
    this.cdr.detectChanges();
  }

  hasError(f: string) {
    return !!this.errors[f];
  }

  get isSuperAdmin(): boolean {
    return this.auth.isSuperAdmin();
  }

  private emptyForm(): CreateCompanyPayload {
    return {
      name: '',
      legalName: '',
      taxIdentifier: '',
      rcNumber: '',
      iceNumber: '',
      cnssNumber: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      country: 'Maroc',
      timezone: 'Africa/Casablanca',
      currency: 'MAD',
      status: 'ACTIVE',
    };
  }

  private emptyCombinedForm(): CreateCompanyWithLicenseAndUsersPayload {
    return {
      company: this.emptyForm(),
      license: {
        planCode: 'BASIC',
        status: 'TRIAL',
        billingCycle: 'MONTHLY',
        startsAt: new Date().toISOString().split('T')[0],
        endsAt: '',
        maxUsers: undefined,
        maxEmployees: undefined,
        maxStorageMb: undefined,
        payrollEnabled: true,
        rhEnabled: true,
        cnssEnabled: false,
        taxEnabled: false,
        damancomEnabled: false,
        notes: '',
      },
      users: [
        {
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          phone: '',
          role: 'ADMIN',
          status: 'ACTIVE',
          permissions: [
            'dashboard',
            'employees',
            'organisation',
            'attendance',
            'contracts',
            'payroll',
            'reports',
            'users',
          ],
        },
      ],
    };
  }

  private validateCombinedForm(): FormErrors {
    const errors: FormErrors = {};

    if (!this.combinedForm.company.name?.trim()) {
      errors['company.name'] = "Le nom de l'entreprise est obligatoire";
    }
    if (!this.combinedForm.license.planCode) {
      errors['license.planCode'] = 'Le plan de licence est obligatoire';
    }
    if (!this.combinedForm.license.startsAt) {
      errors['license.startsAt'] = 'La date de début de licence est obligatoire';
    }
    if (!this.combinedForm.users?.length) {
      errors['users'] = 'Au moins un utilisateur doit être ajouté';
    } else {
      this.combinedForm.users.forEach((user, i) => {
        if (!user.firstName?.trim()) errors[`users.${i}.firstName`] = 'Le prénom est obligatoire';
        if (!user.lastName?.trim()) errors[`users.${i}.lastName`] = 'Le nom est obligatoire';
        if (!user.email?.trim()) errors[`users.${i}.email`] = "L'email est obligatoire";
        if (!user.password?.trim()) errors[`users.${i}.password`] = 'Le mot de passe est obligatoire';
        if (!user.role) errors[`users.${i}.role`] = 'Le rôle est obligatoire';
      });
    }

    return errors;
  }

  isUserPermChecked(user: any, key: string): boolean {
    return Array.isArray(user.permissions) && user.permissions.includes(key);
  }

  toggleUserPermission(user: any, key: string) {
    if (!Array.isArray(user.permissions)) user.permissions = [];
    const idx = user.permissions.indexOf(key);
    idx >= 0 ? user.permissions.splice(idx, 1) : user.permissions.push(key);
    this.cdr.detectChanges();
  }

  onUserRoleChange(user: any) {
    if (user.role && this.ROLE_PRESETS[user.role]) {
      user.permissions = [...this.ROLE_PRESETS[user.role]];
    }
    this.cdr.detectChanges();
  }

  addUser() {
    this.combinedForm.users.push({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      phone: '',
      role: 'ADMIN',
      status: 'ACTIVE',
      permissions: [
        'dashboard',
        'employees',
        'organisation',
        'attendance',
        'contracts',
        'payroll',
        'reports',
        'users',
      ],
    });
    this.cdr.detectChanges();
  }

  removeUser(index: number) {
    if (this.combinedForm.users.length > 1) {
      this.combinedForm.users.splice(index, 1);
      this.cdr.detectChanges();
    }
  }

  generatePassword(userIndex: number, strength: 'basic' | 'strong') {
    const chars = {
      basic: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      strong: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?',
    };
    const length = strength === 'strong' ? 16 : 10;
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars[strength][Math.floor(Math.random() * chars[strength].length)];
    }
    this.combinedForm.users[userIndex].password = password;
    this.cdr.detectChanges();
  }

  togglePasswordVisibility(userIndex: number) {
    this.showPassword[userIndex] = !this.showPassword[userIndex];
    this.cdr.detectChanges();
  }

  roleBadgeClass(role: string): string {
    const map: Record<string, string> = {
      SUPER_ADMIN: 'badge-super-admin',
      ADMIN: 'badge-admin',
      HR_MANAGER: 'badge-hr',
      PAYROLL_MANAGER: 'badge-payroll',
      EMPLOYEE: 'badge-employee',
      VIEWER: 'badge-viewer',
    };
    return map[role] ?? 'badge-custom';
  }

  roleLabel(role: string): string {
    const labels: Record<string, string> = {
      SUPER_ADMIN: 'Super admin',
      ADMIN: 'Admin',
      HR_MANAGER: 'RH',
      PAYROLL_MANAGER: 'Paie',
      EMPLOYEE: 'Employé',
      VIEWER: 'Lecteur',
    };
    return (labels[role] ?? role) || '—';
  }

  roleIcon(role: string): string {
    const icons: Record<string, string> = {
      SUPER_ADMIN: 'bi-shield-lock',
      ADMIN: 'bi-person-badge',
      HR_MANAGER: 'bi-people',
      PAYROLL_MANAGER: 'bi-cash-stack',
      EMPLOYEE: 'bi-person',
      VIEWER: 'bi-eye',
    };
    return icons[role] ?? 'bi-person-fill';
  }
}