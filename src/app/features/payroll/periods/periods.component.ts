import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PayrollPeriodService } from '../../../core/services/domain.services';
import {
  PayrollPeriod, CreatePayrollPeriodPayload, UpdatePayrollPeriodPayload,
  PAYROLL_PERIOD_STATUS_OPTIONS, FormErrors, validateRequired
} from '../../../core/models';

@Component({
  selector: 'app-periods',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './periods.component.html',
  styleUrls: ['./periods.component.scss']
})
export class PeriodsComponent implements OnInit {
  items: PayrollPeriod[] = [];
  filtered: PayrollPeriod[] = [];
  loading = true;
  showModal = false;
  editing = false;
  editingId = '';
  search = '';
  errors: FormErrors = {};

  readonly statusOptions = PAYROLL_PERIOD_STATUS_OPTIONS;
  readonly months = [1,2,3,4,5,6,7,8,9,10,11,12];

  form: CreatePayrollPeriodPayload = {
    companyId: '', year: new Date().getFullYear(), month: new Date().getMonth() + 1,
    startDate: '', endDate: '', status: 'OPEN', isLocked: false,
  };

  constructor(private service: PayrollPeriodService) {}

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
      `${i.year} ${i.month} ${i.status}`.toLowerCase().includes(q)
    );
  }

  openCreate() {
    this.form = {
      companyId: '', year: new Date().getFullYear(), month: new Date().getMonth() + 1,
      startDate: '', endDate: '', status: 'OPEN', isLocked: false,
    };
    this.editing = false; this.editingId = ''; this.errors = {};
    this.showModal = true;
  }

  openEdit(item: PayrollPeriod) {
    this.form = {
      companyId: item.companyId, year: item.year, month: item.month,
      startDate: item.startDate?.slice(0, 10), endDate: item.endDate?.slice(0, 10),
      status: item.status, isLocked: item.isLocked, notes: item.notes ?? '',
    };
    this.editing = true; this.editingId = item.id; this.errors = {};
    this.showModal = true;
  }

  save() {
    this.errors = validateRequired(this.form as any, ['companyId', 'year', 'month', 'startDate', 'endDate']);
    if (this.form.month < 1 || this.form.month > 12) this.errors['month'] = 'Mois invalide (1-12)';
    if (Object.keys(this.errors).length) return;

    const obs = this.editing
      ? this.service.update(this.editingId, this.form as UpdatePayrollPeriodPayload)
      : this.service.create(this.form);

    obs.subscribe({
      next: () => { this.showModal = false; this.load(); },
      error: (e) => { this.errors['api'] = e?.error?.error || 'Erreur serveur'; }
    });
  }

  delete(id: string) {
    if (!confirm('Supprimer cette période ?')) return;
    this.service.delete(id).subscribe(() => this.load());
  }

  close() { this.showModal = false; }
  hasError(field: string) { return !!this.errors[field]; }
}
