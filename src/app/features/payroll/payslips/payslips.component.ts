import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PayslipService } from '../../../core/services/domain.services';
import {
  Payslip, CreatePayslipPayload, UpdatePayslipPayload,
  PAYSLIP_STATUS_OPTIONS, FormErrors, validateRequired
} from '../../../core/models';

@Component({
  selector: 'app-payslips',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payslips.component.html',
  styleUrls: ['./payslips.component.scss']
})
export class PayslipsComponent implements OnInit {
  items: Payslip[] = [];
  filtered: Payslip[] = [];
  loading = true;
  showModal = false;
  editing = false;
  editingId = '';
  search = '';
  errors: FormErrors = {};

  readonly statusOptions = PAYSLIP_STATUS_OPTIONS;

  form: CreatePayslipPayload = {
    companyId: '', employeeId: '', payrollPeriodId: '',
    status: 'DRAFT', grossSalary: 0, netSalary: 0,
    totalAllowances: 0, totalBonuses: 0, totalDeductions: 0,
    totalAdvances: 0, totalTax: 0, totalCnss: 0, currency: 'MAD',
  };

  constructor(private service: PayslipService) {}

  ngOnInit() { this.load(); }

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
      `${i.status} ${i.currency ?? ''}`.toLowerCase().includes(q)
    );
  }

  openCreate() {
    this.form = {
      companyId: '', employeeId: '', payrollPeriodId: '',
      status: 'DRAFT', grossSalary: 0, netSalary: 0,
      totalAllowances: 0, totalBonuses: 0, totalDeductions: 0,
      totalAdvances: 0, totalTax: 0, totalCnss: 0, currency: 'MAD',
    };
    this.editing = false; this.editingId = ''; this.errors = {};
    this.showModal = true;
  }

  openEdit(item: Payslip) {
    this.form = {
      companyId: item.companyId, employeeId: item.employeeId,
      payrollPeriodId: item.payrollPeriodId, payrollRunId: item.payrollRunId ?? '',
      status: item.status, grossSalary: item.grossSalary, netSalary: item.netSalary,
      totalAllowances: item.totalAllowances, totalBonuses: item.totalBonuses,
      totalDeductions: item.totalDeductions, totalAdvances: item.totalAdvances,
      totalTax: item.totalTax, totalCnss: item.totalCnss,
      currency: item.currency ?? 'MAD',
    };
    this.editing = true; this.editingId = item.id; this.errors = {};
    this.showModal = true;
  }

  save() {
    this.errors = validateRequired(this.form as any, ['companyId', 'employeeId', 'payrollPeriodId']);
    if (Object.keys(this.errors).length) return;

    const obs = this.editing
      ? this.service.update(this.editingId, this.form as UpdatePayslipPayload)
      : this.service.create(this.form);

    obs.subscribe({
      next: () => { this.showModal = false; this.load(); },
      error: (e) => { this.errors['api'] = e?.error?.error || 'Erreur serveur'; }
    });
  }

  delete(id: string) {
    if (!confirm('Supprimer ce bulletin ?')) return;
    this.service.delete(id).subscribe(() => this.load());
  }

  close() { this.showModal = false; }
  hasError(field: string) { return !!this.errors[field]; }
}
