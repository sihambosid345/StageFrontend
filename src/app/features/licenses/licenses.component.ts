import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LicenseService } from '../../core/services/domain.services';
import {
  License, CreateLicensePayload, UpdateLicensePayload,
  LICENSE_PLAN_OPTIONS, LICENSE_STATUS_OPTIONS, BILLING_CYCLE_OPTIONS,
  FormErrors, validateRequired
} from '../../core/models';

@Component({
  selector: 'app-licenses',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './licenses.component.html',
  styleUrls: ['./licenses.component.scss']
})
export class LicensesComponent implements OnInit {
  items: License[] = [];
  filtered: License[] = [];
  loading = true;
  showModal = false;
  editing = false;
  editingId = '';
  search = '';
  errors: FormErrors = {};

  readonly planOptions = LICENSE_PLAN_OPTIONS;
  readonly statusOptions = LICENSE_STATUS_OPTIONS;
  readonly billingOptions = BILLING_CYCLE_OPTIONS;

  form: CreateLicensePayload = {
    companyId: '', planCode: 'BASIC', startsAt: '',
    status: 'TRIAL', billingCycle: 'MONTHLY',
    payrollEnabled: true, rhEnabled: true,
    cnssEnabled: false, taxEnabled: false, damancomEnabled: false,
  };

  constructor(private service: LicenseService) {}

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
      `${i.planCode} ${i.status} ${i.billingCycle}`.toLowerCase().includes(q)
    );
  }

  openCreate() {
    this.form = {
      companyId: '', planCode: 'BASIC', startsAt: '',
      status: 'TRIAL', billingCycle: 'MONTHLY',
      payrollEnabled: true, rhEnabled: true,
      cnssEnabled: false, taxEnabled: false, damancomEnabled: false,
    };
    this.editing = false; this.editingId = ''; this.errors = {};
    this.showModal = true;
  }

  openEdit(item: License) {
    this.form = {
      companyId: item.companyId, planCode: item.planCode,
      startsAt: item.startsAt?.slice(0, 10) ?? '',
      endsAt: item.endsAt?.slice(0, 10) ?? '',
      status: item.status, billingCycle: item.billingCycle,
      maxUsers: item.maxUsers ?? undefined,
      maxEmployees: item.maxEmployees ?? undefined,
      maxStorageMb: item.maxStorageMb ?? undefined,
      payrollEnabled: item.payrollEnabled, rhEnabled: item.rhEnabled,
      cnssEnabled: item.cnssEnabled, taxEnabled: item.taxEnabled,
      damancomEnabled: item.damancomEnabled, notes: item.notes ?? '',
    };
    this.editing = true; this.editingId = item.id; this.errors = {};
    this.showModal = true;
  }

  save() {
    this.errors = validateRequired(this.form as any, ['companyId', 'planCode', 'startsAt']);
    if (Object.keys(this.errors).length) return;

    const obs = this.editing
      ? this.service.update(this.editingId, this.form as UpdateLicensePayload)
      : this.service.create(this.form);

    obs.subscribe({
      next: () => { this.showModal = false; this.load(); },
      error: (e) => { this.errors['api'] = e?.error?.error || 'Erreur serveur'; }
    });
  }

  delete(id: string) {
    if (!confirm('Supprimer cette licence ?')) return;
    this.service.delete(id).subscribe(() => this.load());
  }

  close() { this.showModal = false; }
  hasError(field: string) { return !!this.errors[field]; }
}
