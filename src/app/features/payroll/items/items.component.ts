import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PayrollItemService } from '../../../core/services/domain.services';
import {
  PayrollItem, CreatePayrollItemPayload, UpdatePayrollItemPayload,
  PAYROLL_ITEM_TYPE_OPTIONS, FormErrors, validateRequired
} from '../../../core/models';

@Component({
  selector: 'app-items',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './items.component.html',
  styleUrls: ['./items.component.scss']
})
export class ItemsComponent implements OnInit {
  items: PayrollItem[] = [];
  filtered: PayrollItem[] = [];
  loading = true;
  showModal = false;
  editing = false;
  editingId = '';
  search = '';
  errors: FormErrors = {};

  readonly itemTypeOptions = PAYROLL_ITEM_TYPE_OPTIONS;

  form: CreatePayrollItemPayload = {
    companyId: '', payrollRunId: '', employeeId: '',
    itemType: 'BASE_SALARY', label: '', amount: 0,
    taxable: false, cnssApplicable: false, sortOrder: 0,
  };

  constructor(private service: PayrollItemService) {}

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
      `${i.label} ${i.itemType} ${i.code ?? ''}`.toLowerCase().includes(q)
    );
  }

  openCreate() {
    this.form = {
      companyId: '', payrollRunId: '', employeeId: '',
      itemType: 'BASE_SALARY', label: '', amount: 0,
      taxable: false, cnssApplicable: false, sortOrder: 0,
    };
    this.editing = false; this.editingId = ''; this.errors = {};
    this.showModal = true;
  }

  openEdit(item: PayrollItem) {
    this.form = {
      companyId: item.companyId, payrollRunId: item.payrollRunId,
      employeeId: item.employeeId, itemType: item.itemType,
      label: item.label, amount: item.amount,
      code: item.code ?? '', quantity: item.quantity ?? undefined,
      rate: item.rate ?? undefined, taxable: item.taxable,
      cnssApplicable: item.cnssApplicable, sortOrder: item.sortOrder,
    };
    this.editing = true; this.editingId = item.id; this.errors = {};
    this.showModal = true;
  }

  save() {
    this.errors = validateRequired(this.form as any, ['companyId', 'payrollRunId', 'employeeId', 'itemType', 'label']);
    if (this.form.amount === null || this.form.amount === undefined || isNaN(Number(this.form.amount))) {
      this.errors['amount'] = 'Montant invalide';
    }
    if (Object.keys(this.errors).length) return;

    const obs = this.editing
      ? this.service.update(this.editingId, this.form as UpdatePayrollItemPayload)
      : this.service.create(this.form);

    obs.subscribe({
      next: () => { this.showModal = false; this.load(); },
      error: (e) => { this.errors['api'] = e?.error?.error || 'Erreur serveur'; }
    });
  }

  delete(id: string) {
    if (!confirm('Supprimer cette ligne de paie ?')) return;
    this.service.delete(id).subscribe(() => this.load());
  }

  close() { this.showModal = false; }
  hasError(field: string) { return !!this.errors[field]; }
}
