import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PayslipService, EmployeeService, PayrollPeriodService, PayrollRunService, CompanyService } from '../../../core/services/domain.services';
import { AuthService } from '../../../core/services/auth.service';
import { PAYSLIP_STATUS_OPTIONS } from '../../../core/models';
import { Company } from '../../../core/models';

@Component({
  selector: 'app-payslips',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payslips.component.html',
  styleUrls: ['./payslips.component.scss']
})
export class PayslipsComponent implements OnInit {
  items: any[] = [];
  filtered: any[] = [];
  employees: any[] = [];
  periods: any[] = [];
  runs: any[] = [];
  loading = true;
  showModal = false;
  editing = false;
  editingId = '';
  search = '';
  error = '';

  // SUPER_ADMIN
  isSuperAdmin = false;
  companies: Company[] = [];
  selectedFilterCompanyId: string | null = null;

  readonly statusOptions = PAYSLIP_STATUS_OPTIONS;

  form: any = {
    companyId: null,
    employeeId: '', payrollPeriodId: '', payrollRunId: '',
    status: 'DRAFT', grossSalary: 0, netSalary: 0,
    totalAllowances: 0, totalBonuses: 0, totalDeductions: 0,
    totalAdvances: 0, totalTax: 0, totalCnss: 0, currency: 'MAD'
  };

  constructor(
    private service: PayslipService,
    private employeeService: EmployeeService,
    private periodService: PayrollPeriodService,
    private runService: PayrollRunService,
    private companySvc: CompanyService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  get canManagePayroll(): boolean {
    return this.auth.hasPermission('payroll');
  }

  ngOnInit() {
    this.isSuperAdmin = this.auth.isSuperAdmin();

    if (this.isSuperAdmin) {
      this.companySvc.getAll().subscribe({
        next: (companies) => {
          this.companies = companies;
          this.loadAll();
        },
        error: () => this.loadAll()
      });
    } else {
      this.loadAll();
    }
  }

  loadAll() {
    this.load();
    this.employeeService.getAll().subscribe({ next: (d) => { this.employees = d; }, error: () => {} });
    this.periodService.getAll().subscribe({ next: (d) => { this.periods = d; }, error: () => {} });
    this.runService.getAll().subscribe({ next: (d) => { this.runs = d; }, error: () => {} });
  }

  onFilterCompanyChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedFilterCompanyId = val || null;
    this.load();
  }

  getCompanyName(companyId: string | null | undefined): string {
    if (!companyId) return '—';
    return this.companies.find(c => c.id === companyId)?.name ?? companyId;
  }

  load() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (data) => {
        const all = data || [];
        // SUPER_ADMIN : filtre côté client par companyId sélectionné
        this.items = this.isSuperAdmin && this.selectedFilterCompanyId
          ? all.filter((i: any) => i.companyId === this.selectedFilterCompanyId)
          : all;
        this.applySearch();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  applySearch() {
    const q = this.search.toLowerCase();
    this.filtered = q
      ? this.items.filter(i =>
          this.getEmployeeName(i.employeeId).toLowerCase().includes(q) ||
          i.status?.toLowerCase().includes(q) ||
          this.getPeriodLabel(i.payrollPeriodId).includes(q)
        )
      : [...this.items];
  }

  onSearch() { this.applySearch(); }

  getEmployeeName(id: string): string {
    const e = this.employees.find(e => e.id === id);
    return e ? `${e.firstName} ${e.lastName}` : id;
  }

  getPeriodLabel(id: string): string {
    const p = this.periods.find(p => p.id === id);
    return p ? `${p.month}/${p.year}` : '—';
  }

  openCreate() {
    this.form = {
      companyId: this.isSuperAdmin ? (this.selectedFilterCompanyId || null) : null,
      employeeId: '', payrollPeriodId: '', payrollRunId: '',
      status: 'DRAFT', grossSalary: 0, netSalary: 0,
      totalAllowances: 0, totalBonuses: 0, totalDeductions: 0,
      totalAdvances: 0, totalTax: 0, totalCnss: 0, currency: 'MAD'
    };
    this.editing = false; this.editingId = ''; this.error = '';
    this.showModal = true;
  }

  openEdit(item: any) {
    this.form = {
      companyId: item.companyId || null,
      employeeId: item.employeeId, payrollPeriodId: item.payrollPeriodId,
      payrollRunId: item.payrollRunId ?? '',
      status: item.status, grossSalary: item.grossSalary, netSalary: item.netSalary,
      totalAllowances: item.totalAllowances, totalBonuses: item.totalBonuses,
      totalDeductions: item.totalDeductions, totalAdvances: item.totalAdvances,
      totalTax: item.totalTax, totalCnss: item.totalCnss,
      currency: item.currency ?? 'MAD'
    };
    this.editing = true; this.editingId = item.id; this.error = '';
    this.showModal = true;
  }

  save() {
    if (!this.canManagePayroll) {
      this.error = "Vous n'avez pas les droits pour créer ou modifier un bulletin de paie.";
      return;
    }

    if (!this.form.employeeId || !this.form.payrollPeriodId) {
      this.error = 'Employé et période de paie sont obligatoires.'; return;
    }

    // SUPER_ADMIN doit sélectionner une entreprise
    if (this.isSuperAdmin && !this.form.companyId) {
      this.error = 'Veuillez sélectionner une entreprise.';
      return;
    }

    const payload: any = {
      companyId: this.form.companyId || this.auth.currentUser()?.companyId,
      employeeId: this.form.employeeId,
      payrollPeriodId: this.form.payrollPeriodId,
      status: this.form.status,
      grossSalary: +this.form.grossSalary,
      netSalary: +this.form.netSalary,
      totalAllowances: +this.form.totalAllowances,
      totalBonuses: +this.form.totalBonuses,
      totalDeductions: +this.form.totalDeductions,
      totalAdvances: +this.form.totalAdvances,
      totalTax: +this.form.totalTax,
      totalCnss: +this.form.totalCnss,
      currency: this.form.currency,
    };
    if (this.form.payrollRunId) payload.payrollRunId = this.form.payrollRunId;

    const obs = this.editing
      ? this.service.update(this.editingId, payload)
      : this.service.create(payload);

    obs.subscribe({
      next: () => { this.showModal = false; this.load(); },
      error: (e) => { this.error = e?.error?.error || 'Erreur serveur'; }
    });
  }

  delete(id: string) {
    if (!confirm('Supprimer ce bulletin ?')) return;
    this.service.delete(id).subscribe(() => this.load());
  }

  close() { this.showModal = false; }

  statusClass(s: string): string {
    const m: any = { DRAFT: 'badge-secondary', GENERATED: 'badge-info', SENT: 'badge-success', CANCELLED: 'badge-danger' };
    return m[s] ?? 'badge-secondary';
  }
}