import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { PositionService, CompanyService, DepartmentService } from '../../core/services/domain.services';
import { AuthService } from '../../core/services/auth.service';
import {
  Position, Company, Department,
  CreatePositionPayload, UpdatePositionPayload,
  FormErrors, validateRequired
} from '../../core/models';

@Component({
  selector: 'app-positions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './positions.component.html',
  styleUrls: ['./positions.component.scss']
})
export class PositionsComponent implements OnInit {
  items: Position[]      = [];
  filtered: Position[]   = [];
  companies: Company[]   = [];
  departments: Department[] = [];
  loading   = true;
  showModal = false;
  editing   = false;
  editingId = '';
  search    = '';
  companyFilterId = '';
  departmentFilterId = '';
  activityFilter = '';
  pendingCompanyId = '';
  pendingDepartmentId = '';
  pendingActivity = '';
  showFilterPanel = false;
  errors: FormErrors = {};

  form: CreatePositionPayload = {
    companyId: '', name: '', departmentId: '',
    code: '', description: '', isActive: true,
  };

  constructor(
    private service: PositionService,
    private companyService: CompanyService,
    private deptService: DepartmentService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.loadData();
    // Auto-refresh every 30 seconds
    setInterval(() => {
      if (!this.showModal && !this.showFilterPanel) {
        this.loadData();
      }
    }, 30000);
  }
  
  loadData() {
    this.loading = true;
    console.log('🔄 Loading positions...');
    
    forkJoin({
      positions:   this.service.getAll(),
      companies:   this.companyService.getAll(),
      departments: this.deptService.getAll(),
    }).subscribe({
      next: (d) => {
        console.log('✅ Positions loaded:', d.positions?.length || 0);
        this.items       = d.positions || [];
        this.filtered    = [...this.items];
        this.companies   = d.companies || [];
        this.departments = d.departments || [];
        this.loading     = false;
        this.cdr.detectChanges();
        this.applyFilters();
      },
      error: (err) => { 
        console.error('❌ Error loading positions:', err);
        this.loading = false;
        this.items = [];
        this.filtered = [];
        this.cdr.detectChanges();
      }
    });
  }

  load() {
    this.service.getAll().subscribe({
      next: (data) => { 
        console.log('✅ Reloaded positions:', data?.length || 0);
        this.items = data || []; 
        this.applyFilters(); 
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Error reloading positions:', err);
        this.cdr.detectChanges();
      }
    });
  }

  onSearch() {
    this.applyFilters();
  }

  openFilterPanel() {
    this.pendingCompanyId = this.companyFilterId;
    this.pendingDepartmentId = this.departmentFilterId;
    this.pendingActivity = this.activityFilter;
    this.showFilterPanel = true;
  }

  closeFilterPanel() {
    this.showFilterPanel = false;
    this.cdr.detectChanges();
  }

  selectPendingCompany(companyId: string) {
    this.pendingCompanyId = this.pendingCompanyId === companyId ? '' : companyId;
    if (this.pendingCompanyId !== companyId) {
      this.pendingDepartmentId = '';
    }
    this.cdr.detectChanges();
  }

  isPendingCompanySelected(companyId: string): boolean {
    return this.pendingCompanyId === companyId;
  }

  selectPendingDepartment(departmentId: string) {
    this.pendingDepartmentId = this.pendingDepartmentId === departmentId ? '' : departmentId;
    this.cdr.detectChanges();
  }

  isPendingDepartmentSelected(departmentId: string): boolean {
    return this.pendingDepartmentId === departmentId;
  }

  selectPendingActivity(activity: string) {
    this.pendingActivity = this.pendingActivity === activity ? '' : activity;
    this.cdr.detectChanges();
  }

  isPendingActivitySelected(activity: string): boolean {
    return this.pendingActivity === activity;
  }

  applyPendingFilters() {
    this.companyFilterId = this.pendingCompanyId;
    this.departmentFilterId = this.pendingDepartmentId;
    this.activityFilter = this.pendingActivity;
    this.applyFilters();
    this.showFilterPanel = false;
    this.cdr.detectChanges();
  }

  resetPendingFilters() {
    this.pendingCompanyId = '';
    this.pendingDepartmentId = '';
    this.pendingActivity = '';
    this.cdr.detectChanges();
  }

  removeSelectedCompany() {
    this.companyFilterId = '';
    this.applyFilters();
    this.cdr.detectChanges();
  }

  removeSelectedDepartment() {
    this.departmentFilterId = '';
    this.applyFilters();
    this.cdr.detectChanges();
  }

  removeSelectedActivity() {
    this.activityFilter = '';
    this.applyFilters();
    this.cdr.detectChanges();
  }

  applyFilters() {
    const q = this.search.toLowerCase();
    this.filtered = this.items.filter(i => {
      const matchesSearch = `${i.name} ${i.code ?? ''} ${i.description ?? ''}`
        .toLowerCase().includes(q);
      const matchesCompany = this.companyFilterId ? i.companyId === this.companyFilterId : true;
      const matchesDepartment = this.departmentFilterId ? i.departmentId === this.departmentFilterId : true;
      const matchesActivity = this.activityFilter ? String(i.isActive) === this.activityFilter : true;
      return matchesSearch && matchesCompany && matchesDepartment && matchesActivity;
    });
    console.log(`🔍 Filtered positions: ${this.filtered.length} / ${this.items.length}`);
    this.cdr.detectChanges();
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
    this.form = {
      companyId: this.isSuperAdmin ? '' : this.currentCompanyId,
      name: '', 
      departmentId: '', 
      code: '', 
      description: '', 
      isActive: true
    };
    this.editing = false; 
    this.editingId = ''; 
    this.errors = {};
    this.showModal = true;
    this.cdr.detectChanges();
  }

  openEdit(item: Position) {
    this.form = {
      companyId:    item.companyId,
      name:         item.name,
      departmentId: item.departmentId ?? '',
      code:         item.code         ?? '',
      description:  item.description  ?? '',
      isActive:     item.isActive,
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
    if (!payload.departmentId) delete payload.departmentId;

    const obs = this.editing
      ? this.service.update(this.editingId, payload as UpdatePositionPayload)
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
    if (!confirm('Supprimer ce poste ?')) return;
    this.service.delete(id).subscribe({
      next: () => {
        this.load();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Delete error:', err);
        alert(err?.error?.error || 'Erreur lors de la suppression');
        this.cdr.detectChanges();
      }
    });
  }

  /** Départements filtrés selon la company sélectionnée dans le formulaire */
  get filteredDepts(): Department[] {
    if (!this.form.companyId) return [];
    return this.departments.filter(d => d.companyId === this.form.companyId);
  }

  get filterDepartments(): Department[] {
    if (!this.pendingCompanyId) return this.departments;
    return this.departments.filter(d => d.companyId === this.pendingCompanyId);
  }

  /** Réinitialise le département si on change d'entreprise */
  onCompanyChange() { 
    this.form.departmentId = ''; 
    this.cdr.detectChanges();
  }

  companyName(id: string): string { 
    const company = this.companies.find(c => c.id === id);
    return company?.name ?? id; 
  }
  
  departmentName(id: string): string { 
    const dept = this.departments.find(d => d.id === id);
    return dept?.name ?? '—'; 
  }

  close() { 
    this.showModal = false; 
    this.cdr.detectChanges();
  }
  
  hasError(f: string): boolean { 
    return !!this.errors[f]; 
  }
}