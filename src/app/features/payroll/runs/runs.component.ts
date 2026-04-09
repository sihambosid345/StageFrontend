import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PayrollRunService } from '../../../core/services/domain.services';

@Component({
  selector: 'app-runs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './runs.component.html',
  styleUrls: ['./runs.component.scss']
})
export class RunsComponent implements OnInit {
  items: any[] = [];
  filtered: any[] = [];
  loading = true;
  showModal = false;
  editing = false;
  editingId = '';
  search = '';
  form: any = {};
  error = '';

  constructor(private service: PayrollRunService) {}

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
      Object.values(i).some(v => String(v).toLowerCase().includes(q))
    );
  }

  openCreate() {
    this.form = {};
    this.editing = false;
    this.editingId = '';
    this.error = '';
    this.showModal = true;
  }

  openEdit(item: any) {
    this.form = { ...item };
    this.editing = true;
    this.editingId = item.id;
    this.error = '';
    this.showModal = true;
  }

  save() {
    const obs = this.editing
      ? this.service.update(this.editingId, this.form)
      : this.service.create(this.form);
    obs.subscribe({
      next: () => { this.showModal = false; this.load(); },
      error: (e) => { this.error = e?.error?.error || 'Erreur'; }
    });
  }

  delete(id: string) {
    if (!confirm('Supprimer cet élément ?')) return;
    this.service.delete(id).subscribe(() => this.load());
  }

  close() { this.showModal = false; }
}
