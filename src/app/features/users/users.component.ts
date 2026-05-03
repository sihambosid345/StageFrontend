import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { UserService, CompanyService } from '../../core/services/domain.services';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Company } from '../../core/models';

export const PERMISSIONS = [
  { key: 'dashboard',     label: 'Tableau de bord',     icon: 'bi-grid-1x2' },
  { key: 'employees',     label: 'Employés',             icon: 'bi-people' },
  { key: 'payroll',       label: 'Paie',                 icon: 'bi-cash-stack' },
  { key: 'organisation',  label: 'Organisation',         icon: 'bi-building' },
  { key: 'companies',     label: 'Entreprises',          icon: 'bi-buildings' },
  { key: 'attendance',    label: 'Présences',            icon: 'bi-calendar-check' },
  { key: 'contracts',     label: 'Contrats',             icon: 'bi-file-earmark-text' },
  { key: 'reports',       label: 'Rapports CNSS',        icon: 'bi-file-bar-graph' },
  { key: 'licenses',      label: 'Licences',             icon: 'bi-shield-check' },
  { key: 'users',         label: 'Utilisateurs',         icon: 'bi-person-gear' },
];

export const ROLE_PRESETS: Record<string, string[]> = {
  SUPER_ADMIN:      ['dashboard','employees','payroll','organisation','attendance','contracts','reports','licenses','users'],
  ADMIN:            ['dashboard','employees','payroll','organisation','attendance','contracts','reports','licenses','users'],
  HR_MANAGER:       ['dashboard','employees','attendance','contracts','reports','users'],
  PAYROLL_MANAGER:  ['dashboard','payroll','attendance','users'],
  EMPLOYEE:         ['dashboard','users'],
  VIEWER:           ['dashboard','users'],
};

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {
  readonly PERMISSIONS = PERMISSIONS;
  readonly ROLE_PRESETS = ROLE_PRESETS;
  readonly ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PAYROLL_MANAGER', 'EMPLOYEE', 'VIEWER'];

  items: any[] = [];
  filtered: any[] = [];
  companies: Company[] = [];
  loading = true;
  showModal = false;
  editing = false;
  editingId = '';
  search = '';
  companyFilterId = '';
  roleFilter = '';
  statusFilter = '';
  showFilterPanel = false;
  pendingCompanyFilterId = '';
  pendingRoleFilter = '';
  pendingStatusFilter = '';
  error = '';
  showPassword = false;
  queryCompanyId = '';
  toast = '';
  toastTimer: any;

  form: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: string;
    password: string;
    permissions: string[];
    status: string;
    companyId?: string;
  } = this.emptyForm();

  constructor(
    private service: UserService,
    private companyService: CompanyService,
    public auth: AuthService,
    private route: ActivatedRoute,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.load();
    this.loadCompanies();
    
    // Auto-refresh every 30 seconds
    setInterval(() => {
      if (!this.showModal && !this.showFilterPanel) {
        this.load();
      }
    }, 30000);

    this.route.queryParamMap.subscribe(params => {
      const companyId = params.get('companyId');
      if (companyId) {
        this.queryCompanyId = companyId;
        this.openCreate();
      }

      const editUserId = params.get('userId');
      if (editUserId) {
        this.service.getById(editUserId).subscribe({
          next: (user) => {
            const permissions = Array.isArray((user as any).permissions) ? [...(user as any).permissions] : [];
            this.openEdit({
              ...user,
              permissions
            });
            this.cdr.detectChanges();
          },
          error: () => {}
        });
      }
    });
  }

  loadCompanies() {
    if (this.auth.isSuperAdmin()) {
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
    } else {
      const companyId = this.auth.currentUser()?.companyId;
      if (companyId) {
        this.companyService.getById(companyId).subscribe({
          next: (data) => {
            this.companies = data ? [data] : [];
            this.cdr.detectChanges();
          },
          error: () => {
            this.companies = [];
            this.cdr.detectChanges();
          }
        });
      }
    }
  }

  emptyForm() {
    return { firstName: '', lastName: '', email: '', phone: '', role: '', password: '', permissions: [], status: 'ACTIVE' };
  }

  isAdmin(): boolean {
    const user = this.auth.currentUser();
    const role = user?.role;
    return role === 'ADMIN' || role === 'SUPER_ADMIN' || this.auth.isSuperAdmin();
  }

  canManageUsers(): boolean {
    return this.isAdmin();
  }

  load() {
    this.loading = true;
    this.error = '';
    console.log('🔄 Loading users...');
    
    this.service.getAll().subscribe({
      next: (data) => { 
        console.log('✅ Users loaded:', data?.length || 0);
        this.items = data || []; 
        this.applySearch(); 
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => { 
        this.loading = false;
        this.error = err?.error?.error || err?.message || 'Erreur lors du chargement des utilisateurs';
        console.error('❌ Error loading users:', err);
        this.cdr.detectChanges();
        this.toastService?.error(this.error);
      }
    });
  }

  applySearch() {
    const q = this.search.toLowerCase();
    this.filtered = this.items.filter(item => {
      const companyId = item.company?.id || item.companyId || '';
      const matchesSearch = q
        ? `${item.firstName} ${item.lastName} ${item.email ?? ''} ${item.role ?? ''}`
            .toLowerCase().includes(q)
        : true;
      const matchesCompany = this.companyFilterId ? companyId === this.companyFilterId : true;
      const matchesRole = this.roleFilter ? item.role === this.roleFilter : true;
      const matchesStatus = this.statusFilter ? item.status === this.statusFilter : true;
      return matchesSearch && matchesCompany && matchesRole && matchesStatus;
    });
    console.log(`🔍 Filtered users: ${this.filtered.length} / ${this.items.length}`);
    this.cdr.detectChanges();
  }

  onSearch() { 
    this.applySearch(); 
  }

  openFilterPanel() {
    this.pendingCompanyFilterId = this.companyFilterId;
    this.pendingRoleFilter = this.roleFilter;
    this.pendingStatusFilter = this.statusFilter;
    this.showFilterPanel = true;
  }

  closeFilterPanel() {
    this.showFilterPanel = false;
    this.cdr.detectChanges();
  }

  togglePendingCompanySelection(companyId: string) {
    this.pendingCompanyFilterId = this.pendingCompanyFilterId === companyId ? '' : companyId;
    this.cdr.detectChanges();
  }

  isPendingCompanySelected(companyId: string): boolean {
    return this.pendingCompanyFilterId === companyId;
  }

  togglePendingRoleSelection(role: string) {
    this.pendingRoleFilter = this.pendingRoleFilter === role ? '' : role;
    this.cdr.detectChanges();
  }

  isPendingRoleSelected(role: string): boolean {
    return this.pendingRoleFilter === role;
  }

  togglePendingStatusSelection(status: string) {
    this.pendingStatusFilter = this.pendingStatusFilter === status ? '' : status;
    this.cdr.detectChanges();
  }

  isPendingStatusSelected(status: string): boolean {
    return this.pendingStatusFilter === status;
  }

  applyPendingFilters() {
    this.companyFilterId = this.pendingCompanyFilterId;
    this.roleFilter = this.pendingRoleFilter;
    this.statusFilter = this.pendingStatusFilter;
    this.applySearch();
    this.showFilterPanel = false;
    this.cdr.detectChanges();
  }

  resetPendingFilters() {
    this.pendingCompanyFilterId = '';
    this.pendingRoleFilter = '';
    this.pendingStatusFilter = '';
    this.cdr.detectChanges();
  }

  clearCompanyFilter() {
    this.companyFilterId = '';
    this.applySearch();
    this.cdr.detectChanges();
  }

  clearRoleFilter() {
    this.roleFilter = '';
    this.applySearch();
    this.cdr.detectChanges();
  }

  clearStatusFilter() {
    this.statusFilter = '';
    this.applySearch();
    this.cdr.detectChanges();
  }

  companyName(companyId: string): string {
    const company = this.companies.find(c => c.id === companyId);
    return company?.name || '—';
  }

  openCreate() {
    this.form = this.emptyForm();
    if (this.queryCompanyId && this.auth.isSuperAdmin()) {
      this.form.companyId = this.queryCompanyId;
    }
    if (!this.auth.isSuperAdmin()) {
      this.form.companyId = this.auth.currentUser()?.companyId ?? '';
    }
    this.editing = false;
    this.editingId = '';
    this.error = '';
    this.showPassword = false;
    this.showModal = true;
    this.cdr.detectChanges();
  }

  openEdit(item: any) {
    this.form = {
      firstName:   item.firstName ?? '',
      lastName:    item.lastName ?? '',
      email:       item.email ?? '',
      phone:       item.phone ?? '',
      role:        item.role ?? '',
      password:    '',
      permissions: Array.isArray(item.permissions) ? [...item.permissions] : [],
      status:      item.status ?? 'ACTIVE',
      companyId:   item.companyId ?? '',
    };
    this.editing = true;
    this.editingId = item.id;
    this.error = '';
    this.showPassword = false;
    this.showModal = true;
    this.cdr.detectChanges();
  }

  get visibleRoles(): string[] {
    return this.auth.isSuperAdmin()
      ? this.ROLES
      : this.ROLES.filter((role) => role !== 'SUPER_ADMIN');
  }

  onRoleChange() {
    const preset = ROLE_PRESETS[this.form.role];
    if (preset !== undefined) {
      this.form.permissions = [...preset];
    }
    if (this.form.role === 'SUPER_ADMIN') {
      this.form.companyId = undefined;
    }
    this.cdr.detectChanges();
  }

  isPermChecked(key: string): boolean {
    return this.form.permissions.includes(key);
  }

  togglePermission(key: string) {
    const idx = this.form.permissions.indexOf(key);
    if (idx >= 0) {
      this.form.permissions.splice(idx, 1);
    } else {
      this.form.permissions.push(key);
    }
    this.cdr.detectChanges();
  }

  generatePassword(strength: 'basic' | 'strong') {
    const alpha = 'abcdefghijkmnpqrstuvwxyz';
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const digits = '23456789';
    const special = '!@#$%';
    let chars = alpha + digits;
    if (strength === 'strong') chars += upper + special;
    let pw = '';
    for (let i = 0; i < (strength === 'strong' ? 14 : 10); i++) {
      pw += chars[Math.floor(Math.random() * chars.length)];
    }
    this.form.password = pw;
    this.showPassword = true;
    this.cdr.detectChanges();
  }

  save() {
    if (!this.form.firstName || !this.form.lastName || !this.form.email || !this.form.role) {
      this.error = 'Veuillez remplir tous les champs obligatoires.';
      this.cdr.detectChanges();
      return;
    }
    if (!this.editing && !this.form.password) {
      this.error = 'Le mot de passe est obligatoire.';
      this.cdr.detectChanges();
      return;
    }

    const loadingId = this.toastService?.loading('Sauvegarde en cours...');

    const payload: any = {
      firstName:   this.form.firstName,
      lastName:    this.form.lastName,
      email:       this.form.email,
      phone:       this.form.phone || undefined,
      role:        this.form.role,
      permissions: this.form.permissions,
      status:      this.form.status,
      companyId:   this.form.companyId,
    };
    if (this.form.password) payload.password = this.form.password;

    if (!this.auth.isSuperAdmin()) {
      payload.companyId = this.auth.currentUser()?.companyId;
    }

    if (this.auth.isSuperAdmin() && this.form.role === 'SUPER_ADMIN') {
      delete payload.companyId;
    }

    if (this.auth.isSuperAdmin() && this.form.role !== 'SUPER_ADMIN' && !payload.companyId) {
      this.error = 'Le super admin doit choisir une entreprise pour le nouvel utilisateur.';
      this.cdr.detectChanges();
      return;
    }

    const obs = this.editing
      ? this.service.update(this.editingId, payload)
      : this.service.create(payload);

    obs.subscribe({
      next: () => {
        this.showModal = false;
        this.load();
        this.cdr.detectChanges();
        if (this.toastService) {
          this.toastService.update(loadingId, this.editing
            ? `Utilisateur ${this.form.firstName} mis à jour avec succès`
            : `Utilisateur ${this.form.firstName} ${this.form.lastName} créé avec succès`, 'success', 4000);
        } else {
          this.showToast(this.editing
            ? `Utilisateur ${this.form.firstName} mis à jour.`
            : `Utilisateur ${this.form.firstName} ${this.form.lastName} créé avec succès !`
          );
        }
      },
      error: (e) => { 
        this.error = e?.error?.error || 'Erreur lors de l\'enregistrement.';
        this.cdr.detectChanges();
        if (this.toastService) {
          this.toastService.update(loadingId, this.error, 'error', 4000);
        }
      }
    });
  }

  delete(item: any) {
    if (!confirm(`Supprimer ${item.firstName} ${item.lastName} ?`)) return;
    
    this.service.delete(item.id).subscribe({
      next: () => { 
        this.load(); 
        this.cdr.detectChanges();
        this.toastService?.success('Utilisateur supprimé avec succès');
        this.showToast('Utilisateur supprimé.');
      },
      error: (e) => {
        this.toastService?.error(e?.error?.error || 'Erreur lors de la suppression');
        alert(e?.error?.error || 'Erreur lors de la suppression.');
      }
    });
  }

  close() { 
    this.showModal = false; 
    this.cdr.detectChanges();
  }

  showToast(msg: string) {
    this.toast = msg;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast = '', 4000);
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

  get currentCompanyName(): string {
    const companyId = this.auth.currentUser()?.companyId;
    if (!companyId) return 'Entreprise assignée automatiquement';
    const company = this.companies.find(c => c.id === companyId);
    return company?.name ?? 'Entreprise assignée automatiquement';
  }

  getInitials(item: any): string {
    return `${(item.firstName?.[0] ?? '')}${(item.lastName?.[0] ?? '')}`.toUpperCase();
  }
}