import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-payslips',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
<div class="page-container">

  <!-- Header -->
  <div class="page-header">
    <div class="header-left">
      <button class="btn-back" (click)="goBack()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
        Retour aux runs
      </button>
      <div>
        <h1 class="page-title">Bulletins de Paie</h1>
        <p class="page-subtitle" *ngIf="runInfo">
          Run #{{ runInfo.runNumber }} —
          {{ runInfo.period ? formatPeriod(runInfo.period) : '' }}
          <span class="badge" [ngClass]="getStatusClass(runInfo.status)">{{ runInfo.status }}</span>
        </p>
      </div>
    </div>
  </div>

  <!-- Loading -->
  <div class="loading-state" *ngIf="loading">
    <div class="spinner"></div> Chargement des bulletins...
  </div>

  <!-- Stats rapides -->
  <div class="stats-bar" *ngIf="!loading && payslips.length > 0">
    <div class="stat-item">
      <span class="stat-label">Bulletins</span>
      <span class="stat-value">{{ payslips.length }}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Total Brut</span>
      <span class="stat-value">{{ totalGross | number:'1.2-2' }} MAD</span>
    </div>
    <div class="stat-item highlight">
      <span class="stat-label">Total Net</span>
      <span class="stat-value net">{{ totalNet | number:'1.2-2' }} MAD</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Total CNSS sal.</span>
      <span class="stat-value">{{ totalCnss | number:'1.2-2' }} MAD</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Total IR</span>
      <span class="stat-value">{{ totalIr | number:'1.2-2' }} MAD</span>
    </div>
  </div>

  <!-- Table bulletins -->
  <div class="card" *ngIf="!loading">
    <div class="card-header">
      <span class="card-title">{{ payslips.length }} bulletin(s) généré(s)</span>
      <div class="search-box">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input type="text" placeholder="Rechercher employé..." [(ngModel)]="search" (input)="applyFilter()">
      </div>
    </div>

    <div class="empty-state" *ngIf="filtered.length === 0">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5">
        <rect x="4" y="2" width="16" height="20" rx="2"/>
        <line x1="8" y1="7" x2="16" y2="7"/>
        <line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
      <p>Aucun bulletin trouvé</p>
    </div>

    <div class="table-wrapper" *ngIf="filtered.length > 0">
      <table class="data-table">
        <thead>
          <tr>
            <th>EMPLOYÉ</th>
            <th>MATRICULE</th>
            <th>SALAIRE BRUT</th>
            <th>CNSS SAL.</th>
            <th>AMO SAL.</th>
            <th>IR</th>
            <th>NET À PAYER</th>
            <th>STATUT</th>
            <th>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let p of filtered" class="table-row">
            <td class="emp-cell">
              <div class="emp-avatar">{{ getInitials(p) }}</div>
              <span>{{ getEmployeeName(p) }}</span>
            </td>
            <td class="mono">{{ p.employee?.matricule || p.matricule || '—' }}</td>
            <td class="amount">{{ (p.grossSalary ?? 0) | number:'1.2-2' }}</td>
            <td class="amount deduct">{{ (p.totalCnss ?? 0) | number:'1.2-2' }}</td>
            <td class="amount deduct">{{ getAmo(p) | number:'1.2-2' }}</td>
            <td class="amount deduct">{{ (p.incomeTaxAmount ?? p.totalTax ?? 0) | number:'1.2-2' }}</td>
            <td class="amount net">{{ (p.netSalary ?? 0) | number:'1.2-2' }}</td>
            <td>
              <span class="badge" [ngClass]="getPayslipStatusClass(p.status)">{{ p.status }}</span>
            </td>
            <td class="actions-cell">
              <!-- Voir détail -->
              <button class="action-btn btn-view" title="Voir le détail"
                (click)="viewDetail(p)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
              <!-- Télécharger PDF -->
              <button class="action-btn btn-pdf" title="Télécharger PDF"
                [disabled]="downloadingId === p.id"
                (click)="downloadPdf(p)">
                <svg *ngIf="downloadingId !== p.id" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <div class="spinner-sm" *ngIf="downloadingId === p.id"></div>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

</div>
  `,
  styles: [`
    .page-container { padding: 24px; max-width: 1200px; }
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; }
    .header-left { display: flex; align-items: flex-start; gap: 16px; }
    .btn-back { display: flex; align-items: center; gap: 6px; background: #f3f4f6; border: none; padding: 8px 14px; border-radius: 8px; cursor: pointer; font-size: 14px; color: #374151; transition: background 0.15s; flex-shrink: 0; }
    .btn-back:hover { background: #e5e7eb; }
    .page-title { font-size: 22px; font-weight: 700; color: #1a1a2e; margin: 0; }
    .page-subtitle { font-size: 13px; color: #6b7280; margin: 4px 0 0; display: flex; align-items: center; gap: 8px; }
    .badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; }
    .badge-draft { background: #f3f4f6; color: #374151; }
    .badge-processing { background: #fef3c7; color: #92400e; }
    .badge-completed { background: #d1fae5; color: #065f46; }
    .badge-locked { background: #ede9fe; color: #5b21b6; }
    .badge-generated { background: #dbeafe; color: #1e40af; }
    .badge-sent { background: #d1fae5; color: #065f46; }
    .badge-cancelled { background: #fee2e2; color: #991b1b; }

    .loading-state { text-align: center; padding: 60px; color: #9ca3af; }
    .spinner { display: inline-block; width: 20px; height: 20px; border: 2px solid #e5e7eb; border-top-color: #4f46e5; border-radius: 50%; animation: spin 0.8s linear infinite; vertical-align: middle; margin-right: 8px; }
    .spinner-sm { display: inline-block; width: 13px; height: 13px; border: 2px solid rgba(0,0,0,0.15); border-top-color: currentColor; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .stats-bar { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
    .stat-item { background: white; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px 18px; flex: 1; min-width: 140px; }
    .stat-item.highlight { border-color: #a7f3d0; background: #f0fdf4; }
    .stat-label { display: block; font-size: 11px; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.05em; margin-bottom: 4px; }
    .stat-value { display: block; font-size: 18px; font-weight: 700; color: #1a1a2e; }
    .stat-value.net { color: #059669; }

    .card { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
    .card-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; border-bottom: 1px solid #f3f4f6; }
    .card-title { font-size: 15px; font-weight: 600; color: #111827; }
    .search-box { display: flex; align-items: center; gap: 8px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 7px 12px; width: 240px; }
    .search-box input { border: none; background: none; outline: none; font-size: 13px; color: #374151; width: 100%; }

    .empty-state { text-align: center; padding: 48px; color: #9ca3af; }
    .empty-state p { margin-top: 12px; font-size: 14px; }

    .table-wrapper { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .data-table thead { background: #f9fafb; }
    .data-table th { padding: 11px 14px; text-align: left; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e5e7eb; white-space: nowrap; }
    .data-table td { padding: 12px 14px; border-bottom: 1px solid #f3f4f6; color: #374151; }
    .table-row:hover { background: #fafafa; }

    .emp-cell { display: flex; align-items: center; gap: 10px; }
    .emp-avatar { width: 32px; height: 32px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
    .mono { font-family: monospace; font-size: 12px; color: #6b7280; }
    .amount { text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; }
    .amount.deduct { color: #dc2626; }
    .amount.net { color: #059669; font-size: 14px; }

    .actions-cell { display: flex; gap: 6px; align-items: center; }
    .action-btn { width: 32px; height: 32px; border-radius: 7px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
    .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-view { background: #dbeafe; color: #1e40af; }
    .btn-view:hover { background: #bfdbfe; }
    .btn-pdf { background: #d1fae5; color: #065f46; }
    .btn-pdf:hover:not(:disabled) { background: #a7f3d0; }
  `]
})
export class PayslipsComponent implements OnInit, OnDestroy {
  payslips: any[] = [];
  filtered: any[] = [];
  runInfo: any = null;
  loading = true;
  search = '';
  runId = '';
  downloadingId: string | null = null;

  // Stats
  totalGross = 0;
  totalNet = 0;
  totalCnss = 0;
  totalIr = 0;

  private destroy$ = new Subject<void>();
  private api = 'http://localhost:3000';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.runId = params['runId'];
      this.loadRunInfo();
      this.loadPayslips();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadRunInfo(): void {
    this.http.get<any>(`${this.api}/payroll/runs/${this.runId}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (run) => { this.runInfo = run; },
        error: () => {}
      });
  }

  loadPayslips(): void {
    this.loading = true;
    this.http.get<any[]>(`${this.api}/payroll/payslips/run/${this.runId}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.payslips = data || [];
          this.applyFilter();
          this.computeStats();
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Erreur chargement bulletins:', err);
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  computeStats(): void {
    this.totalGross = this.payslips.reduce((s, p) => s + Number(p.grossSalary ?? 0), 0);
    this.totalNet   = this.payslips.reduce((s, p) => s + Number(p.netSalary ?? 0), 0);
    this.totalCnss  = this.payslips.reduce((s, p) => s + Number(p.totalCnss ?? 0), 0);
    this.totalIr    = this.payslips.reduce((s, p) => s + Number(p.incomeTaxAmount ?? p.totalTax ?? 0), 0);
  }

  applyFilter(): void {
    const q = this.search.toLowerCase();
    this.filtered = q
      ? this.payslips.filter(p => this.getEmployeeName(p).toLowerCase().includes(q))
      : [...this.payslips];
  }

  getEmployeeName(p: any): string {
    if (p.employee) return `${p.employee.firstName} ${p.employee.lastName}`;
    if (p.employeeName) return p.employeeName;
    return '—';
  }

  getInitials(p: any): string {
    const name = this.getEmployeeName(p);
    const parts = name.split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  }

  getAmo(p: any): number {
    const snap = p.snapshotData?.appliedRates;
    if (snap?.amoEmployee && p.amoBase) {
      return Math.round(Number(p.amoBase) * snap.amoEmployee * 100) / 100;
    }
    // Fallback: employeeChargesTotal - totalCnss
    return Math.max(0, Number(p.employeeChargesTotal ?? 0) - Number(p.totalCnss ?? 0));
  }

  viewDetail(p: any): void {
    this.router.navigate(['/payroll/runs', this.runId, 'payslips', p.id]);
  }

  downloadPdf(p: any): void {
    this.downloadingId = p.id;
    // Use window.open for simple download — avoids blob complexities
    const url = `${this.api}/payroll/payslips/${p.id}/generate-pdf`;
    // Fetch as blob to handle auth headers if needed
    this.http.get(url, { responseType: 'blob' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const objectUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = objectUrl;
          link.download = `bulletin-${this.getEmployeeName(p).replace(/\s+/g, '-')}-${p.id}.pdf`;
          link.click();
          URL.revokeObjectURL(objectUrl);
          this.downloadingId = null;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Erreur téléchargement PDF:', err);
          // Fallback: direct window open
          window.open(url, '_blank');
          this.downloadingId = null;
          this.cdr.detectChanges();
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/payroll/runs']);
  }

  formatPeriod(period: string): string {
    if (!period) return '—';
    const parts = period.split('-');
    if (parts.length < 2) return period;
    const months = ['Janvier','Février','Mars','Avril','Mai','Juin',
      'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    return `${months[parseInt(parts[1], 10) - 1] ?? parts[1]} ${parts[0]}`;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      DRAFT: 'badge-draft', PROCESSING: 'badge-processing',
      COMPLETED: 'badge-completed', LOCKED: 'badge-locked', ERROR: 'badge-draft'
    };
    return map[status] || 'badge-draft';
  }

  getPayslipStatusClass(status: string): string {
    const map: Record<string, string> = {
      DRAFT: 'badge-draft', GENERATED: 'badge-generated',
      SENT: 'badge-sent', CANCELLED: 'badge-cancelled'
    };
    return map[status] || 'badge-draft';
  }
}