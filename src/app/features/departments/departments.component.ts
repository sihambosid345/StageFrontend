import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { DepartmentService, CompanyService } from '../../core/services/domain.services';
import { AuthService } from '../../core/services/auth.service';
import {
  Department, Company,
  CreateDepartmentPayload, UpdateDepartmentPayload,
  FormErrors, validateRequired
} from '../../core/models';

@Component({
  selector: 'app-departments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './departments.component.html',
  styleUrls: ['./departments.component.scss']
})
export class DepartmentsComponent implements OnInit {
  items: Department[] = [];
  filtered: Department[] = [];
  companies: Company[] = [];
  loading = true;
  showModal = false;
  editing = false;
  editingId = '';
  search = '';
  selectedCompanyId = '';
  activityFilter = '';
  pendingCompanyId = '';
  pendingActivity = '';
  showFilterPanel = false;
  errors: FormErrors = {};

  form: CreateDepartmentPayload = {
    companyId: '',
    name: '',
    code: '',
    description: '',
    isActive: true,
  };

  constructor(
    private service: DepartmentService,
    private companyService: CompanyService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  get isSuperAdmin(): boolean {
    return this.auth.isSuperAdmin();
  }

  get currentCompanyId(): string {
    return this.auth.currentUser()?.companyId ?? '';
  }

  get currentCompanyName(): string {
    const id = this.currentCompanyId;
    return this.companies.find(c => c.id === id)?.name ?? 'Entreprise';
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    console.log('🔄 Loading departments...');
    
    forkJoin({
      departments: this.service.getAll(),
      companies: this.companyService.getAll(),
    }).subscribe({
      next: (d) => {
        console.log('✅ Departments loaded:', d.departments?.length || 0);
        this.items = d.departments || [];
        this.filtered = [...this.items];
        this.companies = d.companies || [];
        this.loading = false;
        this.cdr.detectChanges();
        this.applyFilters();
      },
      error: (err) => {
        console.error('❌ Error loading departments:', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  load() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (data) => {
        console.log('✅ Reloaded departments:', data?.length || 0);
        this.items = data || [];
        this.applyFilters();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Error reloading departments:', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onSearch() {
    this.applyFilters();
  }

  openFilterPanel() {
    this.pendingCompanyId = this.selectedCompanyId;
    this.pendingActivity = this.activityFilter;
    this.showFilterPanel = true;
  }

  closeFilterPanel() {
    this.showFilterPanel = false;
  }

  togglePendingCompanySelection(companyId: string) {
    this.pendingCompanyId = this.pendingCompanyId === companyId ? '' : companyId;
  }

  isPendingCompanySelected(companyId: string): boolean {
    return this.pendingCompanyId === companyId;
  }

  togglePendingActivitySelection(value: string) {
    this.pendingActivity = this.pendingActivity === value ? '' : value;
  }

  isPendingActivitySelected(value: string): boolean {
    return this.pendingActivity === value;
  }

  applyPendingFilters() {
    this.selectedCompanyId = this.pendingCompanyId;
    this.activityFilter = this.pendingActivity;
    this.applyFilters();
    this.closeFilterPanel();
  }

  resetPendingFilters() {
    this.pendingCompanyId = '';
    this.pendingActivity = '';
  }

  removeSelectedCompany() {
    this.selectedCompanyId = '';
    this.applyFilters();
  }

  clearActivityFilter() {
    this.activityFilter = '';
    this.applyFilters();
  }

  applyFilters() {
    const q = this.search.toLowerCase();
    this.filtered = this.items.filter(i => {
      const matchesSearch = `${i.name} ${i.code ?? ''} ${i.description ?? ''}`
        .toLowerCase().includes(q);
      const matchesCompany = this.selectedCompanyId ? i.companyId === this.selectedCompanyId : true;
      const matchesActivity = this.activityFilter ? String(i.isActive) === this.activityFilter : true;
      return matchesSearch && matchesCompany && matchesActivity;
    });
    
    console.log(`🔍 Filtered departments: ${this.filtered.length} / ${this.items.length}`);
  }

  openCreate() {
    this.form = {
      companyId: this.isSuperAdmin ? '' : this.currentCompanyId,
      name: '',
      code: '',
      description: '',
      isActive: true,
    };
    this.editing = false;
    this.editingId = '';
    this.errors = {};
    this.showModal = true;
    this.cdr.detectChanges();
  }

  openEdit(item: Department) {
    this.form = {
      companyId: item.companyId,
      name: item.name,
      code: item.code ?? '',
      description: item.description ?? '',
      isActive: item.isActive,
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

    this.errors = validateRequired(this.form as any, ['companyId', 'name']);
    if (Object.keys(this.errors).length) {
      this.cdr.detectChanges();
      return;
    }

    const payload = { ...this.form };
    if (!payload.code) delete payload.code;
    if (!payload.description) delete payload.description;

    const obs = this.editing
      ? this.service.update(this.editingId, payload as UpdateDepartmentPayload)
      : this.service.create(payload);

    obs.subscribe({
      next: () => {
        this.showModal = false;
        this.load();
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.errors['api'] = e?.error?.error || 'Erreur serveur';
        this.cdr.detectChanges();
      }
    });
  }

  delete(id: string) {
    if (!confirm('Supprimer ce département ?')) return;
    
    this.service.delete(id).subscribe({
      next: () => {
        this.load();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error deleting department:', err);
        alert(err?.error?.error || 'Erreur lors de la suppression');
        this.cdr.detectChanges();
      }
    });
  }

  companyName(id: string): string {
    const company = this.companies.find(c => c.id === id);
    return company?.name ?? id;
  }

  close() {
    this.showModal = false;
    this.cdr.detectChanges();
  }
  
  hasError(f: string): boolean {
    return !!this.errors[f];
  }
}