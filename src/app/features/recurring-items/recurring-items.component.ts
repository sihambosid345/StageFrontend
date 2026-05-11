import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  RecurringItemService,
  EmployeeService,
  CompanyService,
  DepartmentService,
  PositionService,
} from '../../core/services/domain.services';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import {
  RECURRING_ITEM_TYPE_OPTIONS,
  Company,
  Department,
  Position,
  Employee,
} from '../../core/models';

@Component({
  selector: 'app-recurring-items',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './recurring-items.component.html',
  styleUrls: ['./recurring-items.component.scss'],
})
export class RecurringItemsComponent implements OnInit {
  items: any[] = [];
  filtered: any[] = [];
  employees: Employee[] = [];
  companies: Company[] = [];
  departments: Department[] = [];
  positions: Position[] = [];
  loading = true;

  showModal = false;
  editing = false;
  editingId = '';
  search = '';
  error = '';

  readonly typeOptions = RECURRING_ITEM_TYPE_OPTIONS;

  form: any = this.emptyForm();

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
    if (this.auth.isSuperAdmin()) {
      this.loadCompanies();
    }
  }

  get isSuperAdmin(): boolean {
    return this.auth.isSuperAdmin();
  }

  emptyForm() {
    const today = new Date().toISOString().slice(0, 10);
    return {
      companyId: '',
      departmentId: '',
      positionId: '',
      employeeId: '',
      type: 'TRANSPORT',
      label: '',
      valueType: 'FIXED',
      amount: 0,
      percentageValue: null,
      effectiveFrom: today,
      effectiveTo: '',
      isActive: true,
      isTaxable: false,
      isCnssApplicable: false,
      notes: '',
    };
  }

  /** Employés filtrés par entreprise / département / poste (sélection en cascade). */
  get filteredEmployees(): Employee[] {
    let list = this.employees;
    const cid = this.isSuperAdmin
      ? this.form.companyId
      : this.auth.currentUser()?.companyId;
    if (cid) {
      list = list.filter((e) => e.companyId === cid);
    }
    if (this.form.departmentId) {
      list = list.filter((e) => e.departmentId === this.form.departmentId);
    }
    if (this.form.positionId) {
      list = list.filter((e) => e.positionId === this.form.positionId);
    }
    return list;
  }

  private loadDepartmentsForCompany(companyId: string): void {
    if (!companyId) {
      this.departments = [];
      return;
    }
    this.departmentService.getByCompany(companyId).subscribe({
      next: (d: Department[]) => {
        this.departments = d || [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.departments = [];
        this.cdr.detectChanges();
      },
    });
  }

  private loadPositionsForFilters(): void {
    const companyId = this.isSuperAdmin ? this.form.companyId : this.auth.currentUser()?.companyId;
    if (!companyId) {
      this.positions = [];
      return;
    }
    const deptId = this.form.departmentId;
    const req = deptId
      ? this.positionService.getByDepartment(deptId)
      : this.positionService.getByCompany(companyId);
    req.subscribe({
      next: (p: Position[]) => {
        this.positions = p || [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.positions = [];
        this.cdr.detectChanges();
      },
    });
  }

  onCompanyChange(): void {
    this.form.departmentId = '';
    this.form.positionId = '';
    this.form.employeeId = '';
    this.departments = [];
    this.positions = [];
    if (!this.form.companyId) {
      this.cdr.detectChanges();
      return;
    }
    this.loadDepartmentsForCompany(this.form.companyId);
    this.loadPositionsForFilters();
    this.cdr.detectChanges();
  }

  onDepartmentChange(): void {
    this.form.positionId = '';
    this.form.employeeId = '';
    this.loadPositionsForFilters();
    this.cdr.detectChanges();
  }

  onPositionChange(): void {
    this.form.employeeId = '';
    this.cdr.detectChanges();
  }

  loadEmployees() {
    this.employeeService.getAll().subscribe({
      next: (d) => {
        this.employees = d || [];
        this.cdr.detectChanges();
      },
      error: () => this.cdr.detectChanges(),
    });
  }

  loadCompanies() {
    this.companyService.getAll().subscribe({
      next: (d) => {
        this.companies = d || [];
        this.cdr.detectChanges();
      },
      error: () => this.cdr.detectChanges(),
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
        this.items = [];
        this.filtered = [];
        this.loading = false;
        this.toastService?.error('Erreur lors du chargement des éléments récurrents');
        this.cdr.detectChanges();
      },
    });
  }

  applySearch() {
    const q = this.search.toLowerCase();
    this.filtered = this.items.filter((i) => {
      if (!q) return true;
      return (
        this.getEmployeeName(i.employeeId).toLowerCase().includes(q) ||
        i.type?.toLowerCase().includes(q) ||
        i.label?.toLowerCase().includes(q)
      );
    });
    this.cdr.detectChanges();
  }

  onSearch() {
    this.applySearch();
  }

  getEmployeeName(id: string): string {
    const e = this.employees.find((x) => x.id === id);
    return e ? `${e.firstName} ${e.lastName}` : '—';
  }

  openCreate() {
    this.form = this.emptyForm();
    this.departments = [];
    this.positions = [];
    if (!this.isSuperAdmin) {
      const cid = this.auth.currentUser()?.companyId;
      if (cid) {
        this.form.companyId = cid;
        this.loadDepartmentsForCompany(cid);
        this.loadPositionsForFilters();
      }
    }
    this.editing = false;
    this.editingId = '';
    this.error = '';
    this.showModal = true;
    this.cdr.detectChanges();
  }

  openEdit(item: any) {
    const emp = this.employees.find((x) => x.id === item.employeeId);
    this.form = {
      companyId: emp?.companyId ?? (this.isSuperAdmin ? '' : this.auth.currentUser()?.companyId ?? ''),
      departmentId: emp?.departmentId ?? '',
      positionId: emp?.positionId ?? '',
      employeeId: item.employeeId,
      type: item.type,
      label: item.label,
      valueType: item.valueType ?? 'FIXED',
      amount: item.amount ?? 0,
      percentageValue: item.percentageValue ?? null,
      effectiveFrom: item.effectiveFrom?.slice(0, 10),
      effectiveTo: item.effectiveTo ? item.effectiveTo.slice(0, 10) : '',
      isActive: item.isActive ?? true,
      isTaxable: item.isTaxable ?? false,
      isCnssApplicable: item.isCnssApplicable ?? false,
      notes: item.notes ?? '',
    };
    const cid = this.form.companyId;
    if (cid) {
      this.loadDepartmentsForCompany(cid);
      this.loadPositionsForFilters();
    } else {
      this.departments = [];
      this.positions = [];
    }
    this.editing = true;
    this.editingId = item.id;
    this.error = '';
    this.showModal = true;
    this.cdr.detectChanges();
  }

  save() {
    if (this.isSuperAdmin && !this.form.companyId) {
      this.error = "Veuillez sélectionner l'entreprise.";
      this.cdr.detectChanges();
      return;
    }
    if (!this.form.employeeId || !this.form.type || !this.form.label || !this.form.effectiveFrom) {
      this.error = "Employé, type, libellé et date d'effet sont obligatoires.";
      this.cdr.detectChanges();
      return;
    }

    const resolvedCompanyId = this.isSuperAdmin
      ? this.form.companyId
      : this.auth.currentUser()?.companyId;
    const empPick = this.employees.find((e) => e.id === this.form.employeeId);
    if (resolvedCompanyId && empPick && empPick.companyId !== resolvedCompanyId) {
      this.error = "L'employé sélectionné n'appartient pas à l'entreprise choisie.";
      this.cdr.detectChanges();
      return;
    }
    if (!this.filteredEmployees.some((e) => e.id === this.form.employeeId)) {
      this.error = "Choisissez un employé dans la liste filtrée (entreprise / département / poste).";
      this.cdr.detectChanges();
      return;
    }

    const loadingId = this.toastService?.loading('Sauvegarde en cours...');

    const payload: any = {
      companyId: resolvedCompanyId || undefined,
      employeeId: this.form.employeeId,
      type: this.form.type,
      label: this.form.label,
      valueType: this.form.valueType,
      amount: this.form.valueType === 'FIXED' ? +this.form.amount : undefined,
      percentageValue: this.form.valueType === 'PERCENTAGE' ? +this.form.percentageValue : undefined,
      effectiveFrom: this.form.effectiveFrom,
      isActive: !!this.form.isActive,
      isTaxable: !!this.form.isTaxable,
      isCnssApplicable: !!this.form.isCnssApplicable,
    };
    if (this.form.effectiveTo) payload.effectiveTo = this.form.effectiveTo;
    if (this.form.notes) payload.notes = this.form.notes;

    const obs = this.editing ? this.service.update(this.editingId, payload) : this.service.create(payload);

    obs.subscribe({
      next: () => {
        this.showModal = false;
        this.load();
        this.cdr.detectChanges();
        this.toastService?.update(
          loadingId,
          this.editing ? 'Élément récurrent modifié avec succès' : 'Élément récurrent créé avec succès',
          'success',
          4000,
        );
      },
      error: (e) => {
        this.error = e?.error?.error || 'Erreur serveur';
        this.cdr.detectChanges();
        this.toastService?.update(loadingId, this.error, 'error', 4000);
      },
    });
  }

  delete(id: string) {
    if (!confirm('Supprimer cet élément récurrent ?')) return;
    this.service.delete(id).subscribe({
      next: () => {
        this.load();
        this.toastService?.success('Élément récurrent supprimé avec succès');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.toastService?.error(err?.error?.error || 'Erreur lors de la suppression');
        this.cdr.detectChanges();
      },
    });
  }

  close() {
    this.showModal = false;
    this.cdr.detectChanges();
  }
}

