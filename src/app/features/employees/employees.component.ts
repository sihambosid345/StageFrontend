import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmployeeService, DepartmentService, PositionService } from '../../core/services/domain.services';
import {
  Employee, Department, Position,
  CreateEmployeePayload, UpdateEmployeePayload,
  EmployeeStatus, Gender,
  EMPLOYEE_STATUS_OPTIONS, GENDER_OPTIONS,
  FormErrors, validateRequired
} from '../../core/models';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employees.component.html',
  styleUrls: ['./employees.component.scss']
})
export class EmployeesComponent implements OnInit {
  items: Employee[] = [];
  filtered: Employee[] = [];
  departments: Department[] = [];
  positions: Position[] = [];
  loading = true;
  showModal = false;
  editing = false;
  editingId = '';
  search = '';
  errors: FormErrors = {};

  readonly statusOptions = EMPLOYEE_STATUS_OPTIONS;
  readonly genderOptions = GENDER_OPTIONS;

  form: CreateEmployeePayload = {
    companyId: '', firstName: '', lastName: '', hireDate: '',
    status: 'ACTIVE', gender: undefined, departmentId: '', positionId: '',
    phone: '', email: '', address: '', city: '', cin: '',
    cnssNumber: '', matricule: '', baseSalary: undefined,
    paymentMode: '', bankName: '', bankAccountNumber: '',
  };

  constructor(
    private service: EmployeeService,
    private deptService: DepartmentService,
    private posService: PositionService,
  ) {}

  ngOnInit() {
    forkJoin({
      employees: this.service.getAll(),
      departments: this.deptService.getAll(),
      positions: this.posService.getAll(),
    }).subscribe({
      next: (d) => {
        this.items = d.employees; this.filtered = d.employees;
        this.departments = d.departments; this.positions = d.positions;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  load() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (data) => { this.items = data; this.filtered = data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  onSearch() {
    const q = this.search.toLowerCase();
    this.filtered = this.items.filter(i =>
      `${i.firstName} ${i.lastName} ${i.email ?? ''} ${i.cin ?? ''} ${i.matricule ?? ''}`.toLowerCase().includes(q)
    );
  }

  openCreate() {
    this.form = {
      companyId: '', firstName: '', lastName: '', hireDate: '',
      status: 'ACTIVE', departmentId: '', positionId: '',
      phone: '', email: '', address: '', city: '', cin: '',
    };
    this.editing = false; this.editingId = ''; this.errors = {};
    this.showModal = true;
  }

  openEdit(item: Employee) {
    this.form = {
      companyId: item.companyId, firstName: item.firstName, lastName: item.lastName,
      hireDate: item.hireDate?.slice(0, 10) ?? '',
      status: item.status, gender: item.gender ?? undefined,
      departmentId: item.departmentId ?? '', positionId: item.positionId ?? '',
      phone: item.phone ?? '', email: item.email ?? '',
      address: item.address ?? '', city: item.city ?? '',
      cin: item.cin ?? '', cnssNumber: item.cnssNumber ?? '',
      matricule: item.matricule ?? '', baseSalary: item.baseSalary ?? undefined,
      paymentMode: item.paymentMode ?? '', bankName: item.bankName ?? '',
      bankAccountNumber: item.bankAccountNumber ?? '',
      birthDate: item.birthDate?.slice(0, 10) ?? '',
    };
    this.editing = true; this.editingId = item.id; this.errors = {};
    this.showModal = true;
  }

  save() {
    this.errors = validateRequired(this.form as any, ['companyId', 'firstName', 'lastName', 'hireDate']);
    if (Object.keys(this.errors).length) return;

    const payload = { ...this.form };
    if (!payload.gender) delete payload.gender;
    if (!payload.departmentId) delete payload.departmentId;
    if (!payload.positionId) delete payload.positionId;

    const obs = this.editing
      ? this.service.update(this.editingId, payload as UpdateEmployeePayload)
      : this.service.create(payload);

    obs.subscribe({
      next: () => { this.showModal = false; this.load(); },
      error: (e) => { this.errors['api'] = e?.error?.error || 'Erreur serveur'; }
    });
  }

  delete(id: string) {
    if (!confirm('Supprimer cet employé ?')) return;
    this.service.delete(id).subscribe(() => this.load());
  }

  get filteredPositions(): Position[] {
    if (!this.form.departmentId) return this.positions;
    return this.positions.filter(p => p.departmentId === this.form.departmentId);
  }

  close() { this.showModal = false; }
  hasError(field: string) { return !!this.errors[field]; }
}
