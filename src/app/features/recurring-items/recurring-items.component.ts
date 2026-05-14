import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  RecurringItemService, EmployeeService, CompanyService,
  DepartmentService, PositionService,
} from '../../core/services/domain.services';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import {
  RECURRING_ITEM_TYPE_OPTIONS,
  Company, Department, Position, Employee, EmployeeRecurringItem,
} from '../../core/models';

interface RecurringItemForm {
  companyId:        string;
  departmentId:     string;
  positionId:       string;
  employeeId:       string;
  type:             string;
  label:            string;
  valueType:        'FIXED' | 'PERCENTAGE' | 'SENIORITY_SCALE';
  amount:           number;
  percentageValue:  number | null;
  effectiveFrom:    string;
  effectiveTo:      string;
  isActive:         boolean;
  isTaxable:        boolean;
  isCnssApplicable: boolean;
  isAmoApplicable:  boolean; // Correction 6
  notes:            string;
}

@Component({
  selector: 'app-recurring-items',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './recurring-items.component.html',
  styleUrls: ['./recurring-items.component.scss'],
})
export class RecurringItemsComponent implements OnInit {
  items:    any[]        = [];
  filtered: any[]        = [];
  employees: Employee[]  = [];
  companies: Company[]   = [];
  departments: Department[] = [];
  positions:  Position[] = [];
  loading   = true;
  showModal = false;
  editing   = false;
  editingId = '';
  search    = '';
  error     = '';

  readonly typeOptions = RECURRING_ITEM_TYPE_OPTIONS;
  form: RecurringItemForm = this.emptyForm();

  constructor(
    private service: RecurringItemService,
    private employeeService: EmployeeService,
    private companyService: CompanyService,
    private departmentService: DepartmentService,
    private positionService: PositionService,
    private auth: AuthService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
    this.loadEmployees();
    if (this.auth.isSuperAdmin()) { this.loadCompanies(); }
  }

  get isSuperAdmin(): boolean { return this.auth.isSuperAdmin(); }

  emptyForm(): RecurringItemForm {
    const today = new Date().toISOString().slice(0, 10);
    return {
      companyId: '', departmentId: '', positionId: '', employeeId: '',
      type: 'TRANSPORT', label: '',
      valueType: 'FIXED', amount: 0, percentageValue: null,
      effectiveFrom: today, effectiveTo: '',
      isActive: true,
      isTaxable: false,
      isCnssApplicable: false,
      isAmoApplicable: false,   // Correction 6
      notes: '',
    };
  }

  get filteredEmployees(): Employee[] {
    let list = this.employees;
    const cid = this.isSuperAdmin ? this.form.companyId : this.auth.currentUser()?.companyId;
    if (cid)                    list = list.filter(e => e.companyId   === cid);
    if (this.form.departmentId) list = list.filter(e => e.departmentId === this.form.departmentId);
    if (this.form.positionId)   list = list.filter(e => e.positionId  === this.form.positionId);
    return list;
  }

  private loadDepartmentsForCompany(companyId: string): void {
    if (!companyId) { this.departments = []; return; }
    this.departmentService.getByCompany(companyId).subscribe({
      next: (d) => { this.departments = d || []; this.cdr.detectChanges(); },
      error: () => { this.departments = []; this.cdr.detectChanges(); },
    });
  }

  private loadPositionsForFilters(): void {
    const companyId = this.isSuperAdmin ? this.form.companyId : this.auth.currentUser()?.companyId;
    if (!companyId) { this.positions = []; return; }
    const req = this.form.departmentId
      ? this.positionService.getByDepartment(this.form.departmentId)
      : this.positionService.getByCompany(companyId);
    req.subscribe({
      next: (p) => { this.positions = p || []; this.cdr.detectChanges(); },
      error: () => { this.positions = []; this.cdr.detectChanges(); },
    });
  }

  onCompanyChange(): void {
    this.form.departmentId = ''; this.form.positionId = ''; this.form.employeeId = '';
    this.departments = []; this.positions = [];
    if (this.form.companyId) { this.loadDepartmentsForCompany(this.form.companyId); this.loadPositionsForFilters(); }
    this.cdr.detectChanges();
  }

  onDepartmentChange(): void { this.form.positionId = ''; this.form.employeeId = ''; this.loadPositionsForFilters(); this.cdr.detectChanges(); }
  onPositionChange(): void   { this.form.employeeId = ''; this.cdr.detectChanges(); }

  loadEmployees(): void {
    this.employeeService.getAll().subscribe({
      next: (d) => { this.employees = d || []; this.cdr.detectChanges(); },
      error: () => this.cdr.detectChanges(),
    });
  }

  loadCompanies(): void {
    this.companyService.getAll().subscribe({
      next: (d) => { this.companies = d || []; this.cdr.detectChanges(); },
      error: () => this.cdr.detectChanges(),
    });
  }

  load(): void {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (data) => { this.items = data || []; this.applySearch(); this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.items = []; this.filtered = []; this.loading = false; this.cdr.detectChanges(); },
    });
  }

  applySearch(): void {
    const q = this.search.toLowerCase();
    this.filtered = this.items.filter(i =>
      !q ||
      this.getEmployeeName(i.employeeId).toLowerCase().includes(q) ||
      i.type?.toLowerCase().includes(q) ||
      i.label?.toLowerCase().includes(q)
    );
    this.cdr.detectChanges();
  }

  onSearch(): void { this.applySearch(); }

  getEmployeeName(id: string): string {
    const e = this.employees.find(x => x.id === id);
    return e ? `${e.firstName} ${e.lastName}` : '—';
  }

  openCreate(): void {
    this.form = this.emptyForm();
    this.departments = []; this.positions = [];
    if (!this.isSuperAdmin) {
      const cid = this.auth.currentUser()?.companyId;
      if (cid) { this.form.companyId = cid; this.loadDepartmentsForCompany(cid); this.loadPositionsForFilters(); }
    }
    this.editing = false; this.editingId = ''; this.error = '';
    this.showModal = true;
    this.cdr.detectChanges();
  }

  openEdit(item: any): void {
    const emp = this.employees.find(x => x.id === item.employeeId);
    this.form = {
      companyId:        emp?.companyId        ?? (this.isSuperAdmin ? '' : this.auth.currentUser()?.companyId ?? ''),
      departmentId:     emp?.departmentId     ?? '',
      positionId:       emp?.positionId       ?? '',
      employeeId:       item.employeeId       ?? '',
      type:             item.type             ?? 'TRANSPORT',
      label:            item.label            ?? '',
      valueType:        item.valueType        ?? 'FIXED',
      amount:           item.amount           ?? 0,
      percentageValue:  item.percentageValue  ?? null,
      effectiveFrom:    item.effectiveFrom?.slice(0, 10) ?? '',
      effectiveTo:      item.effectiveTo?.slice(0, 10)  ?? '',
      isActive:         item.isActive         ?? true,
      isTaxable:        item.isTaxable        ?? false,
      isCnssApplicable: item.isCnssApplicable ?? false,
      isAmoApplicable:  item.isAmoApplicable  ?? false,  // Correction 6
      notes:            item.notes            ?? '',
    };
    const cid = this.form.companyId;
    if (cid) { this.loadDepartmentsForCompany(cid); this.loadPositionsForFilters(); }
    else     { this.departments = []; this.positions = []; }
    this.editing = true; this.editingId = item.id; this.error = '';
    this.showModal = true;
    this.cdr.detectChanges();
  }

  save(): void {
    this.error = '';
    if (this.isSuperAdmin && !this.form.companyId) { this.error = "Veuillez sélectionner l'entreprise."; this.cdr.detectChanges(); return; }
    if (!this.form.employeeId) { this.error = "Veuillez sélectionner un employé."; this.cdr.detectChanges(); return; }
    if (!this.form.type)       { this.error = "Le type est obligatoire."; this.cdr.detectChanges(); return; }
    if (!this.form.label?.trim()) { this.error = "Le libellé est obligatoire."; this.cdr.detectChanges(); return; }
    if (!this.form.effectiveFrom) { this.error = "La date de début est obligatoire."; this.cdr.detectChanges(); return; }
    if (this.form.valueType === 'FIXED' && (!this.form.amount || this.form.amount <= 0)) {
      this.error = 'Le montant doit être supérieur à 0.'; this.cdr.detectChanges(); return;
    }
    if (this.form.valueType === 'PERCENTAGE' && (!this.form.percentageValue || this.form.percentageValue <= 0)) {
      this.error = 'Le pourcentage doit être supérieur à 0.'; this.cdr.detectChanges(); return;
    }
    if (this.form.effectiveTo && this.form.effectiveTo <= this.form.effectiveFrom) {
      this.error = "La date de fin doit être postérieure à la date de début."; this.cdr.detectChanges(); return;
    }

    const resolvedCompanyId = this.isSuperAdmin ? this.form.companyId : this.auth.currentUser()?.companyId;
    const empPick = this.employees.find(e => e.id === this.form.employeeId);
    if (!empPick) { this.error = "Employé non trouvé."; this.cdr.detectChanges(); return; }

    const payload: any = {
      companyId:        resolvedCompanyId || '',
      employeeId:       this.form.employeeId,
      type:             this.form.type,
      label:            this.form.label.trim(),
      valueType:        this.form.valueType,
      effectiveFrom:    this.form.effectiveFrom,
      isActive:         !!this.form.isActive,
      isTaxable:        !!this.form.isTaxable,
      isCnssApplicable: !!this.form.isCnssApplicable,
      isAmoApplicable:  !!this.form.isAmoApplicable,  // Correction 6
    };
    if (this.form.valueType === 'FIXED')      payload.amount          = +this.form.amount;
    if (this.form.valueType === 'PERCENTAGE') payload.percentageValue = +this.form.percentageValue!;
    if (this.form.effectiveTo)                payload.effectiveTo     = this.form.effectiveTo;
    if (this.form.notes?.trim())              payload.notes           = this.form.notes.trim();

    const loadingId = this.toastService?.loading('Sauvegarde en cours...');
    const obs = this.editing ? this.service.update(this.editingId, payload) : this.service.create(payload);

    obs.subscribe({
      next: () => {
        this.showModal = false; this.load(); this.cdr.detectChanges();
        this.toastService?.update(loadingId, this.editing ? 'Modifié avec succès' : 'Créé avec succès', 'success', 4000);
      },
      error: (error) => {
        let msg = 'Erreur lors de la sauvegarde.';
        if (error.error?.message) msg = error.error.message;
        else if (error.error?.error) msg = error.error.error;
        this.error = msg;
        this.cdr.detectChanges();
        this.toastService?.update(loadingId, msg, 'error', 5000);
      },
    });
  }

  delete(id: string): void {
    if (!confirm('Supprimer cet élément récurrent ?')) return;
    const loadingId = this.toastService?.loading('Suppression en cours...');
    this.service.delete(id).subscribe({
      next: () => { this.load(); this.toastService?.update(loadingId, 'Supprimé avec succès', 'success', 4000); this.cdr.detectChanges(); },
      error: (e) => { this.toastService?.update(loadingId, 'Erreur lors de la suppression', 'error', 4000); this.cdr.detectChanges(); },
    });
  }

  close(): void { this.showModal = false; this.error = ''; this.cdr.detectChanges(); }
}