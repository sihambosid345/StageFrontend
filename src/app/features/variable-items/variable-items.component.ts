import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VariableItemService, EmployeeService, CompanyService } from '../../core/services/domain.services';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { VARIABLE_ITEM_TYPE_OPTIONS, VARIABLE_VALUE_TYPE_OPTIONS, VARIABLE_ITEM_STATUS_OPTIONS, Company } from '../../core/models';

@Component({
  selector: 'app-variable-items',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './variable-items.component.html',
  styleUrls: ['./variable-items.component.scss']
})
export class VariableItemsComponent implements OnInit {
  items: any[] = [];
  filtered: any[] = [];
  employees: any[] = [];
  companies: Company[] = [];
  periods: any[] = [];
  loading = true;
  showModal = false;
  showFilterPanel = false;
  editing = false;
  editingId = '';
  search = '';
  companyFilterId = '';
  pendingCompanyFilterId = '';
  typeFilter = '';
  pendingTypeFilter = '';
  statusFilter = '';
  pendingStatusFilter = '';
  error = '';

  readonly typeOptions = VARIABLE_ITEM_TYPE_OPTIONS;
  readonly valueTypeOptions = VARIABLE_VALUE_TYPE_OPTIONS;
  readonly statusOptions = VARIABLE_ITEM_STATUS_OPTIONS;

  form: any = {
    employeeId: '',
    type: 'ALLOWANCE',
    valueType: 'FIXED',
    label: '',
    amount: 0,
    effectiveDate: '',
    payrollPeriodId: '',
    status: 'PENDING',
    notes: ''
  };

  constructor(
    private service: VariableItemService,
    private employeeService: EmployeeService,
    private companyService: CompanyService,
    private auth: AuthService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.load();
    this.loadEmployees();
    if (this.auth.isSuperAdmin()) {
      this.loadCompanies();
    }
    // Auto-refresh every 30 seconds
    setInterval(() => {
      if (!this.showModal && !this.showFilterPanel) {
        this.load();
      }
    }, 30000);
  }

  loadEmployees() {
    this.employeeService.getAll().subscribe({ 
      next: (d) => { 
        this.employees = d || []; 
        this.cdr.detectChanges();
      }, 
      error: (err) => {
        console.error('Error loading employees:', err);
        this.cdr.detectChanges();
      } 
    });
  }

  load() {
    this.loading = true;
    console.log('🔄 Loading variable items...');
    
    this.service.getAll().subscribe({
      next: (data) => { 
        console.log('✅ Variable items loaded:', data?.length || 0);
        this.items = data || []; 
        this.applySearch(); 
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Error loading variable items:', err);
        this.loading = false;
        this.items = [];
        this.filtered = [];
        this.cdr.detectChanges();
        this.toastService?.error('Erreur lors du chargement des éléments variables');
      }
    });
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

  applySearch() {
    const q = this.search.toLowerCase();
    this.filtered = this.items.filter(i => {
      const matchesSearch = q
        ? this.getEmployeeName(i.employeeId).toLowerCase().includes(q) ||
          i.type?.toLowerCase().includes(q) ||
          i.label?.toLowerCase().includes(q) ||
          i.status?.toLowerCase().includes(q)
        : true;
      const employee = this.employees.find(e => e.id === i.employeeId);
      const matchesCompany = this.companyFilterId
        ? employee?.companyId === this.companyFilterId
        : true;
      const matchesType = this.typeFilter
        ? i.type === this.typeFilter
        : true;
      const matchesStatus = this.statusFilter
        ? i.status === this.statusFilter
        : true;
      return matchesSearch && matchesCompany && matchesType && matchesStatus;
    });
    console.log(`🔍 Filtered variable items: ${this.filtered.length} / ${this.items.length}`);
    this.cdr.detectChanges();
  }

  onSearch() { 
    this.applySearch(); 
  }

  openFilterPanel() {
    this.pendingCompanyFilterId = this.companyFilterId;
    this.pendingTypeFilter = this.typeFilter;
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

  togglePendingTypeSelection(type: string) {
    this.pendingTypeFilter = this.pendingTypeFilter === type ? '' : type;
    this.cdr.detectChanges();
  }

  isPendingTypeSelected(type: string): boolean {
    return this.pendingTypeFilter === type;
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
    this.typeFilter = this.pendingTypeFilter;
    this.statusFilter = this.pendingStatusFilter;
    this.showFilterPanel = false;
    this.applySearch();
    this.cdr.detectChanges();
  }

  resetPendingFilters() {
    this.pendingCompanyFilterId = '';
    this.pendingTypeFilter = '';
    this.pendingStatusFilter = '';
    this.cdr.detectChanges();
  }

  clearCompanyFilter() {
    this.companyFilterId = '';
    this.applySearch();
    this.cdr.detectChanges();
  }

  clearTypeFilter() {
    this.typeFilter = '';
    this.applySearch();
    this.cdr.detectChanges();
  }

  clearStatusFilter() {
    this.statusFilter = '';
    this.applySearch();
    this.cdr.detectChanges();
  }

  getEmployeeName(id: string): string {
    const e = this.employees.find(e => e.id === id);
    return e ? `${e.firstName} ${e.lastName}` : 'Chargement...';
  }

  companyName(id: string): string {
    const company = this.companies.find(c => c.id === id);
    return company?.name ?? '—';
  }

  get isSuperAdmin(): boolean {
    return this.auth.isSuperAdmin();
  }

  getPeriodLabel(id: string): string {
    const p = this.periods.find(p => p.id === id);
    return p ? `${p.month}/${p.year}` : '—';
  }

  emptyForm() {
    const today = new Date().toISOString().slice(0, 10);
    return {
      employeeId: '', 
      type: 'ALLOWANCE', 
      valueType: 'FIXED',
      label: '', 
      amount: 0,
      effectiveDate: today,
      payrollPeriodId: '', 
      status: 'PENDING', 
      notes: ''
    };
  }

  openCreate() {
    this.form = this.emptyForm();
    this.editing = false; 
    this.editingId = ''; 
    this.error = '';
    this.showModal = true;
    this.cdr.detectChanges();
  }

  openEdit(item: any) {
    this.form = {
      employeeId: item.employeeId,
      type: item.type,
      valueType: item.valueType ?? 'FIXED',
      label: item.label,
      amount: item.amount,
      effectiveDate: item.effectiveDate?.slice(0, 10),
      payrollPeriodId: item.payrollPeriodId ?? '',
      status: item.status,
      notes: item.notes ?? ''
    };
    this.editing = true; 
    this.editingId = item.id; 
    this.error = '';
    this.showModal = true;
    this.cdr.detectChanges();
  }

  save() {
    if (!this.form.employeeId || !this.form.type || !this.form.label || !this.form.effectiveDate) {
      this.error = 'Employé, type, libellé et date effective sont obligatoires.';
      this.cdr.detectChanges();
      return;
    }
    
    const loadingId = this.toastService?.loading('Sauvegarde en cours...');
    
    const payload: any = {
      companyId: this.auth.currentUser()?.companyId,
      employeeId: this.form.employeeId,
      type: this.form.type,
      valueType: this.form.valueType,
      label: this.form.label,
      amount: +this.form.amount,
      effectiveDate: this.form.effectiveDate,
      status: this.form.status,
    };
    if (this.form.payrollPeriodId) payload.payrollPeriodId = this.form.payrollPeriodId;
    if (this.form.notes) payload.notes = this.form.notes;

    const obs = this.editing
      ? this.service.update(this.editingId, payload)
      : this.service.create(payload);
      
    obs.subscribe({
      next: () => { 
        this.showModal = false; 
        this.load();
        this.cdr.detectChanges();
        if (this.toastService) {
          this.toastService.update(loadingId, this.editing ? 'Élément variable modifié avec succès' : 'Élément variable créé avec succès', 'success', 4000);
        }
      },
      error: (e) => { 
        this.error = e?.error?.error || 'Erreur serveur';
        this.cdr.detectChanges();
        if (this.toastService) {
          this.toastService.update(loadingId, this.error, 'error', 4000);
        }
      }
    });
  }

  delete(id: string) {
    if (!confirm('Supprimer cet élément variable ?')) return;
    
    this.service.delete(id).subscribe({
      next: () => {
        this.load();
        this.toastService?.success('Élément variable supprimé avec succès');
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

  typeClass(t: string): string {
    const m: any = { 
      ALLOWANCE: 'badge-success', 
      BONUS: 'badge-info', 
      DEDUCTION: 'badge-danger', 
      ADVANCE: 'badge-warning', 
      OVERTIME: 'badge-purple', 
      OTHER: 'badge-secondary' 
    };
    return m[t] ?? 'badge-secondary';
  }

  statusClass(s: string): string {
    const m: any = { 
      PENDING: 'badge-warning', 
      APPROVED: 'badge-success', 
      REJECTED: 'badge-danger', 
      APPLIED: 'badge-info', 
      CANCELLED: 'badge-secondary' 
    };
    return m[s] ?? 'badge-secondary';
  }
}