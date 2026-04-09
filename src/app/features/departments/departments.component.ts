import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DepartmentService } from '../../core/services/domain.services';
import { Department, CreateDepartmentPayload, UpdateDepartmentPayload, FormErrors, validateRequired } from '../../core/models';

@Component({
  selector: 'app-departments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './departments.component.html',
  styleUrls: ['./departments.component.scss']
})
export class DepartmentsComponent implements OnInit {
  items: Department[] = [];
  filtered: Department[] = [];
  loading = true;
  showModal = false;
  editing = false;
  editingId = '';
  search = '';
  errors: FormErrors = {};

  form: CreateDepartmentPayload = {
    companyId: '',
    name: '',
    code: '',
    description: '',
    isActive: true,
  };

  constructor(private service: DepartmentService) {}

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
      `${i.name} ${i.code ?? ''} ${i.description ?? ''}`.toLowerCase().includes(q)
    );
  }

  openCreate() {
    this.form = { companyId: '', name: '', code: '', description: '', isActive: true };
    this.editing = false; this.editingId = ''; this.errors = {};
    this.showModal = true;
  }

  openEdit(item: Department) {
    this.form = {
      companyId: item.companyId,
      name: item.name,
      code: item.code ?? '',
      description: item.description ?? '',
      isActive: item.isActive,
    };
    this.editing = true; this.editingId = item.id; this.errors = {};
    this.showModal = true;
  }

  save() {
    this.errors = validateRequired(this.form as any, ['companyId', 'name']);
    if (Object.keys(this.errors).length) return;

    const obs = this.editing
      ? this.service.update(this.editingId, this.form as UpdateDepartmentPayload)
      : this.service.create(this.form);

    obs.subscribe({
      next: () => { this.showModal = false; this.load(); },
      error: (e) => { this.errors['api'] = e?.error?.error || 'Erreur serveur'; }
    });
  }

  delete(id: string) {
    if (!confirm('Supprimer ce département ?')) return;
    this.service.delete(id).subscribe(() => this.load());
  }

  close() { this.showModal = false; }
  hasError(field: string) { return !!this.errors[field]; }
}
