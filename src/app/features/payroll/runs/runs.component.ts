import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { PayrollService, PayrollRun, TaxBracket, StatutoryRate } from '../../../core/services/payroll-config.service';
import { PayrollConfigWarningComponent } from '../config/warning.component';
import { AuthService } from '../../../core/services/auth.service';
import { CompanyService } from '../../../core/services/domain.services';
import { Company } from '../../../core/models';

@Component({
  selector: 'app-payroll-runs',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PayrollConfigWarningComponent],
  template: `
    <div class="page-container">
      <!-- En-tête -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Exécutions de paie</h1>
          <p class="page-subtitle">Gestion des exécutions de paie</p>
        </div>
        <button class="btn-primary" (click)="openCreateDialog()">
          <span class="btn-icon">+</span> Ajouter
        </button>
      </div>

      <!-- Filtre entreprise — SUPER_ADMIN uniquement -->
      <div class="company-filter-bar" *ngIf="isSuperAdmin">
        <label>🏢 Entreprise :</label>
        <select (change)="onFilterCompanyChange($event)">
          <option value="">Toutes les entreprises</option>
          <option *ngFor="let c of companies" [value]="c.id">{{ c.name }}</option>
        </select>
        <span class="sa-badge">SUPER ADMIN</span>
      </div>

      <!-- Alerte configuration manquante -->
      <app-payroll-config-warning
        [missingRates]="missingRates"
        [missingBrackets]="missingBrackets"
        [configDate]="todayStr"
        (dismissed)="dismissWarning()">
      </app-payroll-config-warning>

      <!-- Table -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Exécutions de paie</span>
          <div class="search-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="text" placeholder="Rechercher..." [(ngModel)]="searchTerm" (input)="applyFilter()">
          </div>
        </div>

        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th *ngIf="isSuperAdmin">ENTREPRISE</th>
                <th>PÉRIODE</th>
                <th>N° RUN</th>
                <th>STATUT</th>
                <th>EMPLOYÉS</th>
                <th>TOTAL BRUT</th>
                <th>TOTAL NET</th>
                <th>CHARGES PATRONALES</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="loading">
                <td [attr.colspan]="isSuperAdmin ? 9 : 8" class="loading-cell">
                  <div class="spinner"></div> Chargement...
                </td>
              </tr>
              <tr *ngIf="!loading && filteredRuns.length === 0">
                <td [attr.colspan]="isSuperAdmin ? 9 : 8" class="empty-cell">Aucune exécution trouvée</td>
              </tr>
              <tr *ngFor="let run of filteredRuns" class="table-row">
                <td *ngIf="isSuperAdmin" class="company-cell">
                  {{ getCompanyName(run.companyId) }}
                </td>
                <td>{{ run?.period ? formatPeriod(run.period) : '—' }}</td>
                <td>#{{ run?.runNumber ?? '—' }}</td>
                <td>
                  <span class="badge" [ngClass]="getStatusClass(run.status)">
                    {{ run.status }}
                  </span>
                </td>
                <td>{{ run.employeeCount ?? 0 }}</td>
                <td>{{ (run.totalGross ?? 0) | number:'1.2-2' }} MAD</td>
                <td class="net-amount">{{ (run.totalNet ?? 0) | number:'1.2-2' }} MAD</td>
                <td>{{ (run.employerContributions ?? 0) | number:'1.2-2' }} MAD</td>
                <td class="actions-cell">
                  <!-- Calculer / Voir détail -->
                  <button
                    class="action-btn btn-calculate"
                    [title]="run.status === 'COMPLETED' || run.status === 'LOCKED' ? 'Voir les bulletins' : 'Calculer'"
                    (click)="handlePrimary(run)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="4" y="2" width="16" height="20" rx="2"/>
                      <line x1="8" y1="7" x2="16" y2="7"/>
                      <line x1="8" y1="12" x2="16" y2="12"/>
                      <line x1="8" y1="17" x2="12" y2="17"/>
                    </svg>
                  </button>
                  <!-- Éditer -->
                  <button
                    class="action-btn btn-edit"
                    title="Modifier"
                    [disabled]="run.status === 'LOCKED' || run.status === 'COMPLETED'"
                    (click)="editRun(run)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <!-- Supprimer -->
                  <button
                    class="action-btn btn-delete"
                    title="Supprimer"
                    [disabled]="run.status === 'LOCKED' || run.status === 'COMPLETED'"
                    (click)="deleteRun(run)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6"/>
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal créer run -->
    <div class="modal-overlay" *ngIf="showCreateModal" (click)="closeCreateDialog()">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>Nouvelle exécution de paie</h2>
          <button class="modal-close" (click)="closeCreateDialog()">✕</button>
        </div>
        <div class="modal-body">
          <!-- Sélecteur entreprise SUPER_ADMIN -->
          <div *ngIf="isSuperAdmin" class="company-field" style="margin-bottom:1rem">
            <label>Entreprise <span style="color:#ef4444">*</span></label>
            <select [(ngModel)]="newCompanyId" class="form-input" style="margin-top:6px">
              <option value="">— Sélectionner une entreprise —</option>
              <option *ngFor="let c of companies" [value]="c.id">{{ c.name }}</option>
            </select>
            <small style="color:#6b7280;font-size:12px;margin-top:4px;display:block">
              Le run sera créé pour cette entreprise.
            </small>
          </div>
          <label>Période (mois/année)</label>
          <input type="month" [(ngModel)]="newPeriod" class="form-input">
          <p class="hint" *ngIf="!configLoaded">
            ⚠️ Vérifiez que les taux légaux et le barème IR sont configurés pour cette période.
          </p>
          <p class="hint success" *ngIf="configLoaded && missingRates.length === 0 && missingBrackets.length === 0">
            ✅ Configuration de paie vérifiée pour la période sélectionnée.
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" (click)="closeCreateDialog()">Annuler</button>
          <button class="btn-primary" [disabled]="!newPeriod || creating || (isSuperAdmin && !newCompanyId)" (click)="createRun()">
            {{ creating ? 'Création...' : 'Créer' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal éditer run -->
    <div class="modal-overlay" *ngIf="showEditModal" (click)="closeEditDialog()">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>Modifier l'exécution #{{ editingRun?.runNumber }}</h2>
          <button class="modal-close" (click)="closeEditDialog()">✕</button>
        </div>
        <div class="modal-body">
          <label>Période (mois/année)</label>
          <input type="month" [(ngModel)]="editPeriod" class="form-input">
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" (click)="closeEditDialog()">Annuler</button>
          <button class="btn-primary" [disabled]="!editPeriod || saving" (click)="saveEdit()">
            {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; }
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; }
    .page-title { font-size: 24px; font-weight: 700; color: #1a1a2e; margin: 0; }
    .page-subtitle { font-size: 13px; color: #6b7280; margin: 4px 0 0; }
    .btn-primary { display: flex; align-items: center; gap: 6px; background: #4f46e5; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    .btn-primary:hover { background: #4338ca; }
    .btn-primary:disabled { background: #9ca3af; cursor: not-allowed; }
    .btn-secondary { background: white; color: #374151; border: 1px solid #d1d5db; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
    .btn-icon { font-size: 18px; line-height: 1; }
    /* Filtre entreprise SUPER_ADMIN */
    .company-filter-bar { display: flex; align-items: center; gap: 0.75rem; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1rem; font-size: 0.875rem; flex-wrap: wrap; }
    .company-filter-bar label { font-weight: 600; color: #1e40af; white-space: nowrap; }
    .company-filter-bar select { border: 1px solid #93c5fd; border-radius: 6px; padding: 0.35rem 0.65rem; font-size: 0.875rem; color: #1e3a8a; background: white; flex: 1; min-width: 200px; max-width: 360px; }
    .sa-badge { display: inline-flex; align-items: center; background: #ede9fe; color: #5b21b6; border-radius: 4px; padding: 0.15rem 0.5rem; font-size: 0.7rem; font-weight: 700; letter-spacing: .05em; }
    .company-field label { display: block; font-size: 14px; font-weight: 600; color: #5b21b6; }
    .company-field select { width: 100%; border: 1px solid #7c3aed; border-radius: 6px; padding: 0.5rem 0.75rem; font-size: 0.9rem; background: white; outline: none; }
    .company-field select:focus { box-shadow: 0 0 0 3px rgba(124,58,237,.15); }
    .company-cell { font-size: 12px; color: #6b7280; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    /* Card & Table */
    .card { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
    .card-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #f3f4f6; }
    .card-title { font-size: 16px; font-weight: 600; color: #111827; }
    .search-box { display: flex; align-items: center; gap: 8px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 12px; width: 280px; }
    .search-box input { border: none; background: none; outline: none; font-size: 14px; color: #374151; width: 100%; }
    .table-wrapper { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th { background: #f9fafb; padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e5e7eb; }
    .data-table td { padding: 14px 16px; font-size: 14px; color: #374151; border-bottom: 1px solid #f3f4f6; }
    .table-row:hover { background: #f9fafb; }
    .net-amount { color: #059669; font-weight: 600; }
    .loading-cell, .empty-cell { text-align: center; padding: 40px !important; color: #9ca3af; }
    .spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid #e5e7eb; border-top-color: #4f46e5; border-radius: 50%; animation: spin 0.8s linear infinite; vertical-align: middle; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .badge-draft { background: #f3f4f6; color: #374151; }
    .badge-processing { background: #fef3c7; color: #92400e; }
    .badge-completed { background: #d1fae5; color: #065f46; }
    .badge-locked { background: #ede9fe; color: #5b21b6; }
    .badge-error { background: #fee2e2; color: #991b1b; }
    .actions-cell { display: flex; gap: 8px; align-items: center; }
    .action-btn { width: 34px; height: 34px; border-radius: 8px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
    .action-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-calculate { background: #d1fae5; color: #065f46; }
    .btn-calculate:hover:not(:disabled) { background: #a7f3d0; }
    .btn-edit { background: #f3f4f6; color: #374151; }
    .btn-edit:hover:not(:disabled) { background: #e5e7eb; }
    .btn-delete { background: #fee2e2; color: #991b1b; }
    .btn-delete:hover:not(:disabled) { background: #fecaca; }
    /* Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal { background: white; border-radius: 12px; width: 480px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
    .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #f3f4f6; }
    .modal-header h2 { font-size: 18px; font-weight: 700; margin: 0; }
    .modal-close { background: none; border: none; font-size: 18px; cursor: pointer; color: #6b7280; }
    .modal-body { padding: 24px; }
    .modal-body label { display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 6px; }
    .form-input { width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; outline: none; box-sizing: border-box; }
    .form-input:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); }
    .hint { font-size: 13px; color: #92400e; background: #fef3c7; padding: 8px 12px; border-radius: 6px; margin-top: 12px; }
    .hint.success { color: #065f46; background: #d1fae5; }
    .modal-footer { display: flex; gap: 12px; justify-content: flex-end; padding: 20px 24px; border-top: 1px solid #f3f4f6; }
  `]
})
export class PayrollRunsComponent implements OnInit, OnDestroy {
  runs: PayrollRun[] = [];
  filteredRuns: PayrollRun[] = [];
  loading = false;
  searchTerm = '';

  // SUPER_ADMIN
  isSuperAdmin = false;
  companies: Company[] = [];
  selectedFilterCompanyId: string | null = null;

  // Modal créer
  showCreateModal = false;
  newPeriod = '';
  newCompanyId = '';
  creating = false;

  // Modal éditer
  showEditModal = false;
  editingRun: PayrollRun | null = null;
  editPeriod = '';
  saving = false;

  configLoaded = false;
  missingRates: string[] = [];
  missingBrackets: TaxBracket[] = [];
  todayStr = new Date().toISOString().split('T')[0];

  private destroy$ = new Subject<void>();

  constructor(
    private payrollSvc: PayrollService,
    private auth: AuthService,
    private companySvc: CompanyService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.isSuperAdmin = this.auth.isSuperAdmin();

    if (this.isSuperAdmin) {
      this.companySvc.getAll()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (companies) => { this.companies = companies; this.loadRuns(); },
          error: () => this.loadRuns()
        });
    } else {
      this.loadRuns();
    }

    this.checkPayrollConfig();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onFilterCompanyChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedFilterCompanyId = val || null;
    this.loadRuns();
  }

  getCompanyName(companyId: string | null | undefined): string {
    if (!companyId) return '—';
    return this.companies.find(c => c.id === companyId)?.name ?? companyId;
  }

  // ─── Chargement ────────────────────────────────────────────

  loadRuns(): void {
    this.loading = true;

    // SUPER_ADMIN : passe ?companyId= si un filtre est sélectionné
    const obs = this.isSuperAdmin
      ? this.payrollSvc.getPayrollRuns(this.selectedFilterCompanyId ?? undefined)
      : this.payrollSvc.getPayrollRuns();

    obs.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const runs: PayrollRun[] = Array.isArray(res) ? res : (res?.data ?? []);
          this.runs = runs;
          this.filteredRuns = runs;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Erreur chargement runs:', err);
          this.runs = [];
          this.filteredRuns = [];
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  checkPayrollConfig(): void {
    this.payrollSvc.loadPayrollConfig(this.todayStr)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ rates, brackets }) => {
          this.configLoaded = true;
          const requiredCodes = ['CNSS_EMPLOYEE', 'CNSS_EMPLOYER', 'AMO_EMPLOYEE', 'AMO_EMPLOYER'];
          const foundCodes = rates.filter(r => r.isActive).map(r => r.code);
          this.missingRates = requiredCodes.filter(c => !foundCodes.includes(c));
          const activeBrackets = brackets.filter(b => b.isActive);
          this.missingBrackets = activeBrackets.length === 0
            ? [{ code: 'IR_SALAIRE' } as TaxBracket]
            : [];
        },
        error: () => { this.configLoaded = false; }
      });
  }

  // ─── Filtrage ──────────────────────────────────────────────

  applyFilter(): void {
    const term = this.searchTerm.toLowerCase();
    this.filteredRuns = this.runs.filter(r =>
      (r.period ?? '').includes(term) ||
      `#${r.runNumber ?? ''}`.includes(term) ||
      (r.status ?? '').toLowerCase().includes(term)
    );
  }

  // ─── Formatage ─────────────────────────────────────────────

  formatPeriod(period: string | undefined | null): string {
    if (!period) return '—';
    const parts = period.split('-');
    if (parts.length < 2) return period;
    const [year, month] = parts;
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    const idx = parseInt(month, 10) - 1;
    return `${months[idx] ?? month} ${year}`;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      DRAFT: 'badge-draft',
      PROCESSING: 'badge-processing',
      COMPLETED: 'badge-completed',
      LOCKED: 'badge-locked',
      ERROR: 'badge-error'
    };
    return map[status] || 'badge-draft';
  }

  // ─── Actions ───────────────────────────────────────────────

  handlePrimary(run: PayrollRun): void {
    if (run.status === 'COMPLETED' || run.status === 'LOCKED') {
      this.router.navigate(['/payroll/runs', run.id, 'payslips']);
    } else {
      this.router.navigate(['/payroll/runs', run.id, 'calculate']);
    }
  }

  editRun(run: PayrollRun): void {
    this.editingRun = run;
    this.editPeriod = run.period ?? '';
    this.showEditModal = true;
  }

  closeEditDialog(): void {
    this.showEditModal = false;
    this.editingRun = null;
    this.editPeriod = '';
  }

  saveEdit(): void {
    if (!this.editingRun || !this.editPeriod) return;
    this.saving = true;
    this.payrollSvc.updatePayrollRun(this.editingRun.id, { period: this.editPeriod })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.saving = false; this.closeEditDialog(); this.loadRuns(); },
        error: (err) => { console.error('Erreur modification run:', err); this.saving = false; }
      });
  }

  deleteRun(run: PayrollRun): void {
    if (!confirm(`Supprimer l'exécution #${run.runNumber} ?`)) return;
    this.payrollSvc.deletePayrollRun(run.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.loadRuns(),
        error: (err) => console.error('Erreur suppression:', err)
      });
  }

  // ─── Modal créer ───────────────────────────────────────────

  openCreateDialog(): void {
    const now = new Date();
    this.newPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    this.newCompanyId = this.isSuperAdmin ? '' : '';
    this.showCreateModal = true;
  }

  closeCreateDialog(): void {
    this.showCreateModal = false;
    this.newPeriod = '';
    this.newCompanyId = '';
  }

  createRun(): void {
    if (!this.newPeriod) return;
    if (this.isSuperAdmin && !this.newCompanyId) return;
    this.creating = true;

    const obs = this.isSuperAdmin
      ? this.payrollSvc.createPayrollRunForCompany(this.newPeriod, this.newCompanyId)
      : this.payrollSvc.createPayrollRun(this.newPeriod);

    obs.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (run) => {
          this.creating = false;
          this.closeCreateDialog();
          this.loadRuns();
          this.router.navigate(['/payroll/runs', run.id, 'calculate']);
        },
        error: (err) => { console.error('Erreur création run:', err); this.creating = false; }
      });
  }

  dismissWarning(): void {
    this.missingRates = [];
    this.missingBrackets = [];
  }
}
