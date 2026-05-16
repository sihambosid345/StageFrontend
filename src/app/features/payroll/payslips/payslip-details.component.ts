import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';

interface PayslipDetail {
  id: string;
  employeeId: string;
  employeeName: string;
  matricule: string;
  payrollPeriodId: string;
  period: string;
  salaryType: 'MONTHLY' | 'DAILY' | 'HOURLY' | 'MISSION';
  
  // Nouvelles bases distinctes
  baseSalary: number;
  grossSalary: number;       // somme gains UNIQUEMENT
  cnssGross: number;         // soumis CNSS (plafonné)
  amoGross: number;          // soumis AMO
  taxableGross: number;      // soumis IR
  cnssBase: number;          // après plafond CNSS
  
  // Cotisations salariales
  cnssEmpAmount: number;
  amoEmpAmount: number;
  cimrEmpAmount: number;
  totalEmpCharges: number;
  
  // Impôts
  incomeTaxBase: number;
  incomeTaxAmount: number;
  
  // Totaux
  netSalary: number;
  totalDeductions: number;
  
  // Cotisations patronales
  employerChargesTotal: number;
  
  // Détail items
  items: PayslipItem[];
  contributions: Contribution[];
  
  // Métadonnées
  snapshotData?: any;
  createdAt: string;
  status: 'DRAFT' | 'GENERATED' | 'SENT' | 'CANCELLED';
}

interface PayslipItem {
  id: string;
  itemType: string;
  code: string;
  label: string;
  amount: number;
  taxable: boolean;
  cnssApplicable: boolean;
  sortOrder: number;
  metadata?: any;
}

interface Contribution {
  code: string;
  label: string;
  baseAmount: number;
  ceilingAmount?: number;
  rate: number;
  employeeAmount: number;
  employerAmount: number;
}

@Component({
  selector: 'app-payslip-details',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Bulletin de Paie</h1>
          <p class="page-subtitle" *ngIf="payslip">{{ payslip.employeeName }} — {{ payslip.period }}</p>
        </div>
        <div class="actions">
          <button class="btn-secondary" (click)="goBack()">← Retour</button>
          <button class="btn-primary" (click)="exportPdf()" *ngIf="payslip">📄 Télécharger PDF</button>
        </div>
      </div>

      <div *ngIf="loading" class="loading-container">
        <div class="spinner-large"></div>
        <p>Chargement du bulletin...</p>
      </div>

      <div *ngIf="!loading && payslip" class="payslip-content">
        <!-- En-tête -->
        <div class="card header-section">
          <div class="header-grid">
            <div class="header-item">
              <span class="label">Employé</span>
              <span class="value">{{ payslip.employeeName }}</span>
            </div>
            <div class="header-item">
              <span class="label">Matricule</span>
              <span class="value code">{{ payslip.matricule }}</span>
            </div>
            <div class="header-item">
              <span class="label">Période</span>
              <span class="value">{{ payslip.period }}</span>
            </div>
            <div class="header-item">
              <span class="label">Type de Salaire</span>
              <span class="value badge" [class]="'salary-' + payslip.salaryType?.toLowerCase()">{{ payslip.salaryType }}</span>
            </div>
          </div>
        </div>

        <!-- Éléments de paie -->
        <div class="card items-section">
          <h2 class="section-title">Éléments de Paie</h2>
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>LIBELLÉ</th>
                  <th>MONTANT</th>
                  <th>TAXABLE</th>
                  <th>CNSS APPLICABLE</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of payslip.items" class="item-row" [class]="getItemClass(item)">
                  <td class="label-cell">{{ item.label }}</td>
                  <td class="amount-cell" [class]="item.amount > 0 ? 'positive' : 'negative'">
                    {{ item.amount | number:'1.2-2' }} MAD
                  </td>
                  <td class="center-cell">
                    <span class="badge-small" [class]="item.taxable ? 'yes' : 'no'">
                      {{ item.taxable ? 'Oui' : 'Non' }}
                    </span>
                  </td>
                  <td class="center-cell">
                    <span class="badge-small" [class]="item.cnssApplicable ? 'yes' : 'no'">
                      {{ item.cnssApplicable ? 'Oui' : 'Non' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Bases de calcul distinctes -->
        <div class="bases-section">
          <div class="base-card">
            <span class="base-label">Salaire de Base</span>
            <span class="base-amount">{{ payslip.baseSalary | number:'1.2-2' }} MAD</span>
            <span class="base-info">Salaire contractuel ou calculé</span>
          </div>

          <div class="base-card highlight">
            <span class="base-label">Brut (Gains)</span>
            <span class="base-amount">{{ payslip.grossSalary | number:'1.2-2' }} MAD</span>
            <span class="base-info">Somme des gains uniquement</span>
          </div>

          <div class="base-card">
            <span class="base-label">Base CNSS</span>
            <span class="base-amount">{{ payslip.cnssBase | number:'1.2-2' }} MAD</span>
            <span class="base-info" *ngIf="payslip.snapshotData?.cnssCeiling">
              Plafonné à {{ payslip.snapshotData.cnssCeiling | number:'1.2-2' }} MAD
            </span>
          </div>

          <div class="base-card">
            <span class="base-label">Base AMO</span>
            <span class="base-amount">{{ payslip.amoGross | number:'1.2-2' }} MAD</span>
            <span class="base-info">Éléments AMO applicables</span>
          </div>

          <div class="base-card">
            <span class="base-label">Brut Imposable</span>
            <span class="base-amount">{{ payslip.taxableGross | number:'1.2-2' }} MAD</span>
            <span class="base-info">Soumis à l'IR</span>
          </div>
        </div>

        <!-- Cotisations salariales -->
        <div class="card contributions-section">
          <h2 class="section-title">Cotisations Salariales</h2>
          <div class="contributions-grid">
            <div class="contribution-item" *ngFor="let contrib of payslip.contributions | slice:0:3">
              <span class="contrib-label">{{ contrib.label }}</span>
              <div class="contrib-details">
                <div class="contrib-row">
                  <span>Base: {{ contrib.baseAmount | number:'1.2-2' }} MAD</span>
                  <span>Taux: {{ (contrib.rate * 100) | number:'1.2-2' }}%</span>
                </div>
                <div class="contrib-amount">
                  - {{ contrib.employeeAmount | number:'1.2-2' }} MAD
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Impôts -->
        <div class="card tax-section" *ngIf="payslip.incomeTaxAmount > 0">
          <h2 class="section-title">Impôt sur le Revenu (IR)</h2>
          <div class="tax-details">
            <div class="tax-row">
              <span>Base imposable</span>
              <span class="amount">{{ payslip.incomeTaxBase | number:'1.2-2' }} MAD</span>
            </div>
            <div class="tax-row highlight">
              <span>IR à payer</span>
              <span class="amount">- {{ payslip.incomeTaxAmount | number:'1.2-2' }} MAD</span>
            </div>
          </div>
        </div>

        <!-- Récapitulatif -->
        <div class="card summary-section">
          <h2 class="section-title">Récapitulatif</h2>
          <div class="summary-grid">
            <div class="summary-item">
              <span class="summary-label">Brut</span>
              <span class="summary-amount positive">+ {{ payslip.grossSalary | number:'1.2-2' }} MAD</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Cotisations Salariales</span>
              <span class="summary-amount negative">- {{ payslip.totalEmpCharges | number:'1.2-2' }} MAD</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Impôt IR</span>
              <span class="summary-amount negative">- {{ payslip.incomeTaxAmount | number:'1.2-2' }} MAD</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Autres Déductions</span>
              <span class="summary-amount negative">
                - {{ (payslip.totalDeductions - payslip.totalEmpCharges - payslip.incomeTaxAmount) | number:'1.2-2' }} MAD
              </span>
            </div>
            <div class="summary-item highlight">
              <span class="summary-label">NET À PAYER</span>
              <span class="summary-amount-large">{{ payslip.netSalary | number:'1.2-2' }} MAD</span>
            </div>
          </div>
        </div>

        <!-- Cotisations patronales -->
        <div class="card employer-section">
          <h2 class="section-title">Cotisations Patronales</h2>
          <div class="employer-details">
            <div class="employer-row" *ngFor="let contrib of payslip.contributions | slice:3">
              <span>{{ contrib.label }}</span>
              <span class="amount">+ {{ contrib.employerAmount | number:'1.2-2' }} MAD</span>
            </div>
            <div class="employer-total">
              <span>Total Cotisations Patronales</span>
              <span class="amount">+ {{ payslip.employerChargesTotal | number:'1.2-2' }} MAD</span>
            </div>
          </div>
        </div>

        <!-- Métadonnées calcul -->
        <div class="card metadata-section" *ngIf="payslip.snapshotData">
          <h2 class="section-title">Données de Calcul</h2>
          <div class="metadata-grid">
            <div class="metadata-item">
              <span class="metadata-label">Date de Calcul</span>
              <span class="metadata-value">{{ payslip.snapshotData.calculationDate | date:'dd/MM/yyyy HH:mm' }}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Type de Contrat</span>
              <span class="metadata-value">{{ payslip.snapshotData.contractType }}</span>
            </div>
            <div class="metadata-item" *ngIf="payslip.snapshotData.baseRateDetails">
              <span class="metadata-label">Détails Base</span>
              <span class="metadata-value">{{ formatRateDetails(payslip.snapshotData.baseRateDetails) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <style>
      .page-container { max-width: 1000px; margin: 0 auto; padding: 24px; }
      .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
      .page-title { margin: 0; font-size: 28px; font-weight: 700; }
      .page-subtitle { margin: 4px 0 0; font-size: 14px; color: #6b7280; }
      .actions { display: flex; gap: 12px; }

      .loading-container { text-align: center; padding: 60px 20px; }
      .spinner-large { display: inline-block; width: 40px; height: 40px; border: 4px solid #e5e7eb; border-radius: 50%; border-top-color: #3b82f6; animation: spin 1s linear infinite; margin-bottom: 16px; }
      @keyframes spin { to { transform: rotate(360deg); } }

      .payslip-content { display: flex; flex-direction: column; gap: 20px; }

      .card { background: white; border-radius: 8px; border: 1px solid #e5e7eb; padding: 20px; }

      .header-section { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
      .header-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 20px; }
      .header-item { }
      .header-item .label { display: block; font-size: 12px; opacity: 0.9; margin-bottom: 4px; }
      .header-item .value { display: block; font-size: 16px; font-weight: 600; }
      .header-item .code { font-family: monospace; }
      .header-item .badge { display: inline-block; background: rgba(255, 255, 255, 0.2); padding: 4px 12px; border-radius: 12px; font-size: 12px; }
      .salary-monthly { background: rgba(59, 130, 246, 0.2); }
      .salary-daily { background: rgba(34, 197, 94, 0.2); }
      .salary-hourly { background: rgba(251, 146, 60, 0.2); }
      .salary-mission { background: rgba(168, 85, 247, 0.2); }

      .section-title { margin: 0 0 16px; font-size: 16px; font-weight: 700; border-bottom: 2px solid #f3f4f6; padding-bottom: 12px; }

      .table-wrapper { overflow-x: auto; }
      .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
      .data-table thead { background: #f9fafb; }
      .data-table th { padding: 10px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; }
      .data-table td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
      .data-table tbody tr:hover { background: #fafafa; }
      .item-row { }
      .item-row.deduction { background: #fef2f2; }
      .item-row.tax { background: #fef3c7; }

      .label-cell { font-weight: 500; }
      .amount-cell { text-align: right; font-weight: 600; }
      .amount-cell.positive { color: #059669; }
      .amount-cell.negative { color: #dc2626; }
      .center-cell { text-align: center; }
      .badge-small { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
      .badge-small.yes { background: #dcfce7; color: #166534; }
      .badge-small.no { background: #fee2e2; color: #991b1b; }

      .bases-section { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin: 20px 0; }
      .base-card { background: white; border-radius: 8px; border: 1px solid #e5e7eb; padding: 16px; display: flex; flex-direction: column; gap: 8px; text-align: center; }
      .base-card.highlight { border: 2px solid #3b82f6; background: #eff6ff; }
      .base-label { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; }
      .base-amount { font-size: 20px; font-weight: 700; color: #111827; }
      .base-info { font-size: 11px; color: #9ca3af; }

      .contributions-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; }
      .contribution-item { background: #f9fafb; padding: 12px; border-radius: 6px; border-left: 4px solid #3b82f6; }
      .contrib-label { display: block; font-weight: 600; font-size: 13px; margin-bottom: 8px; }
      .contrib-details { font-size: 12px; color: #6b7280; }
      .contrib-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
      .contrib-amount { display: block; color: #dc2626; font-weight: 600; margin-top: 8px; }

      .tax-details { }
      .tax-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
      .tax-row.highlight { font-weight: 700; border: none; color: #dc2626; }
      .tax-row .amount { text-align: right; }

      .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .summary-item { display: flex; justify-content: space-between; padding: 12px; background: #f9fafb; border-radius: 6px; }
      .summary-item.highlight { grid-column: 1 / -1; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-size: 16px; font-weight: 700; padding: 16px; }
      .summary-label { }
      .summary-amount { }
      .summary-amount.positive { color: #059669; }
      .summary-amount.negative { color: #dc2626; }
      .summary-amount-large { font-size: 24px; font-weight: 700; }

      .employer-details { }
      .employer-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
      .employer-total { display: flex; justify-content: space-between; padding: 12px 0; margin-top: 8px; font-weight: 700; border-top: 2px solid #e5e7eb; }
      .employer-row .amount, .employer-total .amount { text-align: right; color: #059669; }

      .metadata-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
      .metadata-item { padding: 10px; background: #f9fafb; border-radius: 6px; }
      .metadata-label { display: block; font-size: 12px; font-weight: 600; color: #6b7280; margin-bottom: 4px; }
      .metadata-value { display: block; font-family: monospace; font-size: 13px; }

      .btn-primary { background: #3b82f6; color: white; border: none; padding: 10px 16px; border-radius: 6px; font-weight: 500; cursor: pointer; }
      .btn-primary:hover { background: #2563eb; }
      .btn-secondary { background: #e5e7eb; color: #111827; border: none; padding: 10px 16px; border-radius: 6px; font-weight: 500; cursor: pointer; }
      .btn-secondary:hover { background: #d1d5db; }

      @media (max-width: 768px) {
        .header-grid { grid-template-columns: 1fr 1fr; }
        .summary-grid { grid-template-columns: 1fr; }
      }
    </style>
  `
})
export class PayslipDetailsComponent implements OnInit, OnDestroy {
  payslip: PayslipDetail | null = null;
  loading = true;
  runId: string = '';
  payslipId: string = '';

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.runId = params['runId'];
      this.payslipId = params['payslipId'];
      this.loadPayslip();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPayslip() {
    this.loading = true;
    this.http.get<PayslipDetail>(`http://localhost:3000/payroll/runs/${this.runId}/payslips/${this.payslipId}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.payslip = data;
          this.loading = false;
        },
        error: (err) => {
          console.error('Erreur chargement bulletin:', err);
          this.loading = false;
        }
      });
  }

  getItemClass(item: PayslipItem): string {
    if (item.itemType === 'TAX') return 'tax';
    if (item.amount < 0) return 'deduction';
    return '';
  }

  formatRateDetails(details: any): string {
    if (!details) return '—';
    if (details.type === 'MONTHLY') return 'Salaire mensuel fixe';
    if (details.type === 'DAILY') return `${details.workedDays} jours × ${details.dailyRate} MAD/jour`;
    if (details.type === 'HOURLY') return `${details.workedHours} heures × ${details.hourlyRate} MAD/h`;
    if (details.type === 'MISSION') return `Tarif mission: ${details.missionRate} MAD`;
    return '—';
  }

  exportPdf() {
    if (!this.payslip) return;
    window.location.href = `http://localhost:3000/payroll/runs/${this.runId}/payslips/${this.payslipId}/pdf`;
  }

  goBack() {
    window.history.back();
  }
}
