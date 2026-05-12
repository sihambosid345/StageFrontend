import { Component, OnInit, ChangeDetectorRef, NgZone, ApplicationRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PayrollItemService, PayrollRunService, EmployeeService } from '../../../core/services/domain.services';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { PAYROLL_ITEM_TYPE_OPTIONS } from '../../../core/models';

@Component({
  selector: 'app-items',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './items.component.html',
  styleUrls: ['./items.component.scss']
})
export class ItemsComponent implements OnInit {
  items: any[] = [];
  filtered: any[] = [];
  employees: any[] = [];
  runs: any[] = [];
  loading = true;
  showModal = false;
  editing = false;
  editingId = '';
  search = '';
  error = '';

  readonly itemTypeOptions = PAYROLL_ITEM_TYPE_OPTIONS;

  form: any = {
    payrollRunId: '', employeeId: '',
    itemType: 'BASE_SALARY', label: '', amount: 0,
    taxable: false, cnssApplicable: false
  };

  constructor(
    private service: PayrollItemService,
    private runService: PayrollRunService,
    private employeeService: EmployeeService,
    private auth: AuthService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private appRef: ApplicationRef
  ) {}

  ngOnInit() {
    requestAnimationFrame(() => {
      this.ngZone.run(() => { this.loadAll(); });
    });
    setTimeout(() => {
      if (this.items.length === 0) this.loadAll();
    }, 500);
  }

  loadAll() {
    this.ngZone.run(() => {
      this.loadItems();
      this.loadEmployees();
      this.loadRuns();
    });
  }

  loadEmployees() {
    this.employeeService.getAll().subscribe({
      next: (d: any[]) => {
        this.ngZone.run(() => { this.employees = d || []; this.cdr.detectChanges(); });
      },
      error: (err: any) => { console.error('Erreur chargement employés:', err); this.employees = []; }
    });
  }

  loadRuns() {
    this.runService.getAll().subscribe({
      next: (d: any[]) => {
        this.ngZone.run(() => { this.runs = d || []; this.cdr.detectChanges(); });
      },
      error: (err: any) => { console.error('Erreur chargement runs:', err); this.runs = []; }
    });
  }

  loadItems() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (data: any[]) => {
        this.ngZone.run(() => {
          this.items = data || [];
          this.applySearch();
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: (err: any) => {
        this.ngZone.run(() => {
          console.error('Erreur chargement items:', err);
          this.loading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  applySearch() {
    const q = this.search.toLowerCase();
    this.filtered = q
      ? this.items.filter((i: any) =>
          i.label?.toLowerCase().includes(q) ||
          i.itemType?.toLowerCase().includes(q) ||
          this.getEmployeeName(i.employeeId).toLowerCase().includes(q)
        )
      : [...this.items];
    this.cdr.detectChanges();
  }

  onSearch() { this.applySearch(); }

  getEmployeeName(id: string): string {
    const e = this.employees.find((e: any) => e.id === id);
    return e ? `${e.firstName} ${e.lastName}` : id;
  }

  getRunLabel(id: string): string {
    const r = this.runs.find((r: any) => r.id === id);
    return r ? `Run #${r.runNumber} (${r.status})` : id;
  }

  openCreate() {
    this.form = {
      payrollRunId: '', employeeId: '',
      itemType: 'BASE_SALARY', label: '', amount: 0,
      taxable: false, cnssApplicable: false
    };
    this.editing = false; this.editingId = ''; this.error = '';
    this.showModal = true;
    this.cdr.detectChanges();
  }

  openEdit(item: any) {
    this.form = {
      payrollRunId: item.payrollRunId, employeeId: item.employeeId,
      itemType: item.itemType, label: item.label, amount: item.amount,
      taxable: item.taxable, cnssApplicable: item.cnssApplicable
    };
    this.editing = true; this.editingId = item.id; this.error = '';
    this.showModal = true;
    this.cdr.detectChanges();
  }

  save() {
    if (!this.form.payrollRunId || !this.form.employeeId || !this.form.label) {
      this.error = 'Exécution, employé et libellé sont obligatoires.';
      return;
    }
    const selectedRun = this.runs.find((r: any) => r.id === this.form.payrollRunId);
    if (!selectedRun) { this.error = 'Exécution de paie introuvable.'; return; }

    const payload: any = {
      companyId: selectedRun.companyId || selectedRun.company?.id || null,
      payrollRunId: this.form.payrollRunId,
      employeeId: this.form.employeeId,
      itemType: this.form.itemType,
      label: this.form.label,
      amount: +this.form.amount,
      taxable: this.form.taxable,
      cnssApplicable: this.form.cnssApplicable,
    };

    const loadingId = this.toastService?.loading('Sauvegarde en cours...');
    const obs = this.editing
      ? this.service.update(this.editingId, payload)
      : this.service.create(payload);

    obs.subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.showModal = false;
          this.loadAll();
          this.toastService?.update(loadingId, this.editing ? 'Ligne modifiée avec succès' : 'Ligne créée avec succès', 'success', 4000);
          this.cdr.detectChanges();
        });
      },
      error: (e: any) => {
        this.ngZone.run(() => {
          this.error = e?.error?.error || 'Erreur serveur';
          this.toastService?.update(loadingId, this.error, 'error', 4000);
          this.cdr.detectChanges();
        });
      }
    });
  }

  delete(id: string) {
    if (!confirm('Supprimer cette ligne de paie ?')) return;
    this.service.delete(id).subscribe({
      next: () => {
        this.ngZone.run(() => { this.loadAll(); this.toastService?.success('Ligne supprimée.'); this.cdr.detectChanges(); });
      },
      error: (err: any) => {
        this.ngZone.run(() => {
          this.error = err?.error?.error || 'Erreur serveur';
          this.toastService?.error(this.error);
          this.cdr.detectChanges();
        });
      }
    });
  }

  close() { this.showModal = false; this.cdr.detectChanges(); }

  itemTypeClass(t: string): string {
    const m: Record<string, string> = {
      BASE_SALARY: 'badge-info', ALLOWANCE: 'badge-success',
      BONUS: 'badge-purple', OVERTIME: 'badge-warning',
      DEDUCTION: 'badge-danger', ADVANCE: 'badge-warning',
      TAX: 'badge-danger', CNSS: 'badge-secondary',
      AMO: 'badge-secondary', OTHER: 'badge-secondary'
    };
    return m[t] ?? 'badge-secondary';
  }
}