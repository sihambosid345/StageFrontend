import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';

export interface StatutoryRate {
  id: string;
  code: string;           // 'CNSS_EMPLOYEE' | 'CNSS_EMPLOYER' | 'AMO_EMPLOYEE' | 'AMO_EMPLOYER' | 'CIMR_EMPLOYEE' | 'CIMR_EMPLOYER'
  label: string;
  rate: number;           // ex: 0.0448
  ceiling?: number;       // plafond mensuel CNSS
  effectiveFrom: string;
  effectiveTo?: string;
  version: number;
  isActive: boolean;
  companyId?: string | null;
}

export interface TaxBracket {
  id: string;
  code: string;           // 'IR_SALAIRE'
  minAmount: number;
  maxAmount?: number;     // null = illimité
  rate: number;           // ex: 0.10
  deduction: number;      // déduction fixe de la tranche
  effectiveFrom: string;
  effectiveTo?: string;
  version: number;
  isActive: boolean;
  companyId?: string | null;
}

export interface PayrollRun {
  id: string;
  runNumber: number;
  period: string;         // 'YYYY-MM'
  status: 'DRAFT' | 'PROCESSING' | 'COMPLETED' | 'LOCKED' | 'ERROR';
  employeeCount: number;
  totalGross: number;
  totalNet: number;
  employerContributions: number;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollItem {
  id: string;
  payslipId: string;
  type: 'EARNING' | 'DEDUCTION' | 'EMPLOYER_CONTRIBUTION' | 'INFORMATION';
  source: 'SALARY_COMPONENT' | 'STATUTORY' | 'MANUAL' | 'ADVANCE';
  code: string;
  label: string;
  amount: number;
  isTaxable: boolean;
  isCnssApplicable: boolean;
  isAmoApplicable: boolean;
  sortOrder: number;
}

export interface Payslip {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employeeName: string;
  matricule: string;
  period: string;
  salaryType: 'MONTHLY' | 'DAILY' | 'HOURLY' | 'MISSION';
  baseSalary: number;
  grossSalary: number;       // somme gains uniquement
  taxableGross: number;      // soumis IR
  cnssGross: number;         // soumis CNSS (plafonné)
  amoGross: number;          // soumis AMO
  cnssEmployee: number;
  amoEmployee: number;
  irAmount: number;
  netSalary: number;
  cnssEmployer: number;
  amoEmployer: number;
  items: PayrollItem[];
  status: 'DRAFT' | 'VALIDATED' | 'PAID';
}

export interface PayrollCalculationResult {
  payrollRunId: string;
  processedCount: number;
  errorCount: number;
  totalGross: number;
  totalNet: number;
  totalEmployerContributions: number;
  errors: { employeeId: string; message: string }[];
}

@Injectable({ providedIn: 'root' })
export class PayrollService {
  private api = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  // ─── STATUTORY RATES ───────────────────────────────────────────────────────

  getStatutoryRates(date?: string, companyId?: string): Observable<StatutoryRate[]> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    if (companyId) params = params.set('companyId', companyId);
    return this.http.get<StatutoryRate[]>(`${this.api}/payroll/statutory-rates`, { params });
  }

  getStatutoryRateByCode(code: string, date?: string): Observable<StatutoryRate> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    return this.http.get<StatutoryRate>(`${this.api}/payroll/statutory-rates/${code}`, { params });
  }

  createStatutoryRate(rate: Partial<StatutoryRate>): Observable<StatutoryRate> {
    return this.http.post<StatutoryRate>(`${this.api}/payroll/statutory-rates`, rate);
  }

  updateStatutoryRate(id: string, rate: Partial<StatutoryRate>): Observable<StatutoryRate> {
    return this.http.put<StatutoryRate>(`${this.api}/payroll/statutory-rates/${id}`, rate);
  }

  deleteStatutoryRate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/payroll/statutory-rates/${id}`);
  }

  // ─── TAX BRACKETS ──────────────────────────────────────────────────────────

  getTaxBrackets(code: string = 'IR_SALAIRE', date?: string, companyId?: string): Observable<TaxBracket[]> {
    let params = new HttpParams().set('code', code);
    if (date) params = params.set('date', date);
    if (companyId) params = params.set('companyId', companyId);
    return this.http.get<TaxBracket[]>(`${this.api}/payroll/tax-brackets`, { params });
  }

  createTaxBracket(bracket: Partial<TaxBracket>): Observable<TaxBracket> {
    return this.http.post<TaxBracket>(`${this.api}/payroll/tax-brackets`, bracket);
  }

  updateTaxBracket(id: string, bracket: Partial<TaxBracket>): Observable<TaxBracket> {
    return this.http.put<TaxBracket>(`${this.api}/payroll/tax-brackets/${id}`, bracket);
  }

  deleteTaxBracket(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/payroll/tax-brackets/${id}`);
  }

  // ─── SEED (initialisation des taux légaux marocains) ──────────────────────

  seedStatutoryRates(): Observable<{ message: string; created: number }> {
    return this.http.post<{ message: string; created: number }>(`${this.api}/payroll/statutory-rates/seed`, {});
  }

  seedTaxBrackets(): Observable<{ message: string; created: number }> {
    return this.http.post<{ message: string; created: number }>(`${this.api}/payroll/tax-brackets/seed`, {});
  }

  // ─── PAYROLL RUNS ──────────────────────────────────────────────────────────

  getPayrollRuns(): Observable<PayrollRun[]> {
    return this.http.get<PayrollRun[]>(`${this.api}/payroll/runs`);
  }

  getPayrollRun(id: string): Observable<PayrollRun> {
    return this.http.get<PayrollRun>(`${this.api}/payroll/runs/${id}`);
  }

  createPayrollRun(period: string): Observable<PayrollRun> {
    return this.http.post<PayrollRun>(`${this.api}/payroll/runs`, { period });
  }

  deletePayrollRun(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/payroll/runs/${id}`);
  }

  // ─── CALCUL ────────────────────────────────────────────────────────────────

  calculateRun(runId: string): Observable<PayrollCalculationResult> {
    return this.http.post<PayrollCalculationResult>(
      `${this.api}/payroll/runs/${runId}/calculate`, {}
    );
  }

  validateRun(runId: string): Observable<PayrollRun> {
    return this.http.post<PayrollRun>(`${this.api}/payroll/runs/${runId}/validate`, {});
  }

  lockRun(runId: string): Observable<PayrollRun> {
    return this.http.post<PayrollRun>(`${this.api}/payroll/runs/${runId}/lock`, {});
  }

  // ─── PAYSLIPS ──────────────────────────────────────────────────────────────

  getPayslips(runId: string): Observable<Payslip[]> {
    return this.http.get<Payslip[]>(`${this.api}/payroll/runs/${runId}/payslips`);
  }

  getPayslip(runId: string, payslipId: string): Observable<Payslip> {
    return this.http.get<Payslip>(`${this.api}/payroll/runs/${runId}/payslips/${payslipId}`);
  }

  exportPayslipPdf(runId: string, payslipId: string): Observable<Blob> {
    return this.http.get(`${this.api}/payroll/runs/${runId}/payslips/${payslipId}/pdf`, {
      responseType: 'blob'
    });
  }

  // ─── HELPER : charger taux + barème IR en parallèle ────────────────────────

  loadPayrollConfig(date: string): Observable<{ rates: StatutoryRate[]; brackets: TaxBracket[] }> {
    return forkJoin({
      rates: this.getStatutoryRates(date),
      brackets: this.getTaxBrackets('IR_SALAIRE', date)
    });
  }


  updatePayrollRun(id: string, data: Partial<{ period: string }>): Observable<PayrollRun> {
  return this.http.patch<PayrollRun>(`${this.api}/payroll/runs/${id}`, data);
}
}