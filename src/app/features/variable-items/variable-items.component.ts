import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VariableItemService, EmployeeService, CompanyService } from '../../core/services/domain.services';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import {
  VARIABLE_ITEM_TYPE_OPTIONS,
  VARIABLE_VALUE_TYPE_OPTIONS,
  VARIABLE_ITEM_STATUS_OPTIONS,
  VARIABLE_ITEM_IS_GAIN,   // Correction 13 : mapping centralisé
  Company,
  VariableItemType,
  VariableItemStatus,
} from '../../core/models';

@Component({
  selector: 'app-variable-items',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './variable-items.component.html',
  styleUrls: ['./variable-items.component.scss']
})
export class VariableItemsComponent implements OnInit {
  items:    any[] = [];
  filtered: any[] = [];
  employees: any[] = [];
  companies: Company[] = [];
  loading   = true;
  showModal = false;
  showFilterPanel = false;
  editing   = false;
  editingId = '';
  search    = '';
  companyFilterId       = '';
  pendingCompanyFilterId = '';
  typeFilter            = '';
  pendingTypeFilter     = '';
  statusFilter          = '';
  pendingStatusFilter   = '';
  error = '';

  readonly typeOptions      = VARIABLE_ITEM_TYPE_OPTIONS;
  readonly valueTypeOptions = VARIABLE_VALUE_TYPE_OPTIONS;
  readonly statusOptions    = VARIABLE_ITEM_STATUS_OPTIONS;

  // Correction 10 : APPLIED n'est pas sélectionnable dans le formulaire
  readonly editableStatuses: VariableItemStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

  form: any = this.emptyForm();

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
    if (this.auth.isSuperAdmin()) { this.loadCompanies(); }
    setInterval(() => {
      if (!this.showModal && !this.showFilterPanel) { this.load(); }
    }, 30000);
  }

  // ── Correction 13 : helper centralisé ────────────────────────────────────
  isGain(type: string): boolean {
    return VARIABLE_ITEM_IS_GAIN[type as VariableItemType] ?? true;
  }

  loadEmployees() {
    this.employeeService.getAll().subscribe({
      next: (d) => { this.employees = d || []; this.cdr.detectChanges(); },
      error: () => this.cdr.detectChanges()
    });
  }

  load() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (data) => {
        this.items = data || [];
        this.applySearch();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading  = false;
        this.items    = [];
        this.filtered = [];
        this.cdr.detectChanges();
        this.toastService?.error('Erreur lors du chargement');
      }
    });
  }

  loadCompanies() {
    this.companyService.getAll().subscribe({
      next: (data) => { this.companies = data || []; this.cdr.detectChanges(); },
      error: () => this.cdr.detectChanges()
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
      const matchesCompany = this.companyFilterId ? employee?.companyId === this.companyFilterId : true;
      const matchesType    = this.typeFilter       ? i.type === this.typeFilter     : true;
      const matchesStatus  = this.statusFilter     ? i.status === this.statusFilter : true;
      return matchesSearch && matchesCompany && matchesType && matchesStatus;
    });
    this.cdr.detectChanges();
  }

  onSearch() { this.applySearch(); }

  openFilterPanel()  { this.pendingCompanyFilterId = this.companyFilterId; this.pendingTypeFilter = this.typeFilter; this.pendingStatusFilter = this.statusFilter; this.showFilterPanel = true; }
  closeFilterPanel() { this.showFilterPanel = false; this.cdr.detectChanges(); }
  togglePendingCompanySelection(id: string) { this.pendingCompanyFilterId = this.pendingCompanyFilterId === id ? '' : id; }
  isPendingCompanySelected(id: string)      { return this.pendingCompanyFilterId === id; }
  togglePendingTypeSelection(t: string)     { this.pendingTypeFilter = this.pendingTypeFilter === t ? '' : t; }
  isPendingTypeSelected(t: string)          { return this.pendingTypeFilter === t; }
  togglePendingStatusSelection(s: string)   { this.pendingStatusFilter = this.pendingStatusFilter === s ? '' : s; }
  isPendingStatusSelected(s: string)        { return this.pendingStatusFilter === s; }
  applyPendingFilters() { this.companyFilterId = this.pendingCompanyFilterId; this.typeFilter = this.pendingTypeFilter; this.statusFilter = this.pendingStatusFilter; this.showFilterPanel = false; this.applySearch(); }
  resetPendingFilters() { this.pendingCompanyFilterId = ''; this.pendingTypeFilter = ''; this.pendingStatusFilter = ''; }
  clearCompanyFilter()  { this.companyFilterId = ''; this.applySearch(); }
  clearTypeFilter()     { this.typeFilter = ''; this.applySearch(); }
  clearStatusFilter()   { this.statusFilter = ''; this.applySearch(); }

  getEmployeeName(id: string): string {
    const e = this.employees.find(e => e.id === id);
    return e ? `${e.firstName} ${e.lastName}` : '...';
  }

  companyName(id: string): string {
    return this.companies.find(c => c.id === id)?.name ?? '—';
  }

  get isSuperAdmin(): boolean { return this.auth.isSuperAdmin(); }

  emptyForm() {
    const today = new Date().toISOString().slice(0, 10);
    return {
      employeeId:      '',
      type:            'COMMISSION',
      valueType:       'FIXED',
      label:           '',
      amount:          0,
      effectiveDate:   today,
      payrollPeriodId: '',
      status:          'PENDING',
      notes:           '',
      // Correction 4/5/6 : flags par défaut
      isCnssApplicable: false,
      isTaxable:        false,
      isAmoApplicable:  false,
    };
  }

  openCreate() {
    this.form      = this.emptyForm();
    this.editing   = false;
    this.editingId = '';
    this.error     = '';
    this.showModal = true;
    this.cdr.detectChanges();
  }

  openEdit(item: any) {
    this.form = {
      employeeId:       item.employeeId,
      type:             item.type,
      valueType:        item.valueType ?? 'FIXED',
      label:            item.label,
      amount:           item.amount,
      effectiveDate:    item.effectiveDate?.slice(0, 10),
      payrollPeriodId:  item.payrollPeriodId ?? '',
      // Correction 10 : si APPLIED, afficher APPROVED pour permettre modification
      status:           item.status === 'APPLIED' ? 'APPROVED' : item.status,
      notes:            item.notes ?? '',
      isCnssApplicable: item.isCnssApplicable ?? false,
      isTaxable:        item.isTaxable ?? false,
      isAmoApplicable:  item.isAmoApplicable ?? false,
    };
    this.editing   = true;
    this.editingId = item.id;
    this.error     = '';
    this.showModal = true;
    this.cdr.detectChanges();
  }

  save() {
    if (!this.form.employeeId || !this.form.type || !this.form.label || !this.form.effectiveDate) {
      this.error = 'Employé, type, libellé et date effective sont obligatoires.';
      this.cdr.detectChanges();
      return;
    }

    const gain = this.isGain(this.form.type);

    const payload: any = {
      employeeId:       this.form.employeeId,
      type:             this.form.type,
      valueType:        this.form.valueType,
      label:            this.form.label,
      amount:           +this.form.amount,
      effectiveDate:    this.form.effectiveDate,
      status:           this.form.status,
      // Correction 4/5/6 : flags
      isCnssApplicable: gain ? !!this.form.isCnssApplicable : false,
      isTaxable:        gain ? !!this.form.isTaxable        : false,
      isAmoApplicable:  gain ? !!this.form.isAmoApplicable  : false,
    };
    if (this.form.payrollPeriodId) payload.payrollPeriodId = this.form.payrollPeriodId;
    if (this.form.notes)           payload.notes           = this.form.notes;

    const loadingId = this.toastService?.loading('Sauvegarde en cours...');
    const obs = this.editing
      ? this.service.update(this.editingId, payload)
      : this.service.create(payload);

    obs.subscribe({
      next: () => {
        this.showModal = false;
        this.load();
        this.cdr.detectChanges();
        this.toastService?.update(loadingId, this.editing ? 'Modifié avec succès' : 'Créé avec succès', 'success', 4000);
      },
      error: (e) => {
        this.error = e?.error?.error || e?.error?.message || 'Erreur serveur';
        this.cdr.detectChanges();
        this.toastService?.update(loadingId, this.error, 'error', 4000);
      }
    });
  }

  delete(id: string) {
    if (!confirm('Supprimer cet élément variable ?')) return;
    this.service.delete(id).subscribe({
      next: () => { this.load(); this.toastService?.success('Supprimé avec succès'); this.cdr.detectChanges(); },
      error: (e) => { this.toastService?.error(e?.error?.error || 'Erreur lors de la suppression'); this.cdr.detectChanges(); }
    });
  }

  close() { this.showModal = false; this.cdr.detectChanges(); }

  typeClass(t: string): string {
    const m: any = {
      COMMISSION: 'badge-info',    FRAIS:   'badge-warning',
      AVANCE:     'badge-orange',  RETENUE: 'badge-danger',
      PRIME:      'badge-success',
    };
    return m[t] ?? 'badge-secondary';
  }

  statusClass(s: string): string {
    const m: any = {
      PENDING: 'badge-warning', APPROVED: 'badge-success',
      REJECTED: 'badge-danger', APPLIED: 'badge-info', CANCELLED: 'badge-secondary'
    };
    return m[s] ?? 'badge-secondary';
  }
}