// ============================================================
// payroll-api.service.ts
// Service Angular centralisé — toutes les APIs Paie
// ============================================================
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  StatutoryRate, TaxBracket, PayrollRun, Payslip,
  Employee, SalaryVariable, PayrollItem
} from '../models/payroll.models';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable({ providedIn: 'root' })
export class PayrollApiService {

  private readonly BASE = '/api';

  constructor(private http: HttpClient) {}

  // ─── STATUTORY RATES ──────────────────────────────────────

  getStatutoryRates(activeOnly = true): Observable<StatutoryRate[]> {
    const params = new HttpParams().set('activeOnly', String(activeOnly));
    return this.http.get<ApiResponse<StatutoryRate[]>>(`${this.BASE}/statutory-rates`, { params })
      .pipe(map(r => r.data), catchError(this.handleError));
  }

  getStatutoryRateByCode(code: string, period?: string): Observable<StatutoryRate> {
    let params = new HttpParams();
    if (period) params = params.set('period', period);
    return this.http.get<ApiResponse<StatutoryRate>>(`${this.BASE}/statutory-rates/${code}`, { params })
      .pipe(map(r => r.data), catchError(this.handleError));
  }

  createStatutoryRate(rate: Partial<StatutoryRate>): Observable<StatutoryRate> {
    return this.http.post<ApiResponse<StatutoryRate>>(`${this.BASE}/statutory-rates`, rate)
      .pipe(map(r => r.data), catchError(this.handleError));
  }

  updateStatutoryRate(id: string, rate: Partial<StatutoryRate>): Observable<StatutoryRate> {
    return this.http.put<ApiResponse<StatutoryRate>>(`${this.BASE}/statutory-rates/${id}`, rate)
      .pipe(map(r => r.data), catchError(this.handleError));
  }

  deactivateStatutoryRate(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.BASE}/statutory-rates/${id}`)
      .pipe(map(() => void 0), catchError(this.handleError));
  }

  // ─── TAX BRACKETS ─────────────────────────────────────────

  getTaxBrackets(year?: number): Observable<TaxBracket[]> {
    let params = new HttpParams();
    if (year) params = params.set('year', String(year));
    return this.http.get<ApiResponse<TaxBracket[]>>(`${this.BASE}/tax-brackets`, { params })
      .pipe(map(r => r.data), catchError(this.handleError));
  }

  createTaxBracket(bracket: Partial<TaxBracket>): Observable<TaxBracket> {
    return this.http.post<ApiResponse<TaxBracket>>(`${this.BASE}/tax-brackets`, bracket)
      .pipe(map(r => r.data), catchError(this.handleError));
  }

  updateTaxBracket(id: string, bracket: Partial<TaxBracket>): Observable<TaxBracket> {
    return this.http.put<ApiResponse<TaxBracket>>(`${this.BASE}/tax-brackets/${id}`, bracket)
      .pipe(map(r => r.data), catchError(this.handleError));
  }

  deleteTaxBracket(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.BASE}/tax-brackets/${id}`)
      .pipe(map(() => void 0), catchError(this.handleError));
  }

  // ─── PAYROLL RUNS ─────────────────────────────────────────

  getPayrollRuns(page = 1, pageSize = 10): Observable<PaginatedResponse<PayrollRun>> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<ApiResponse<PaginatedResponse<PayrollRun>>>(`${this.BASE}/payroll-runs`, { params })
      .pipe(map(r => r.data), catchError(this.handleError));
  }

  getPayrollRunById(id: string): Observable<PayrollRun> {
    return this.http.get<ApiResponse<PayrollRun>>(`${this.BASE}/payroll-runs/${id}`)
      .pipe(map(r => r.data), catchError(this.handleError));
  }

  createPayrollRun(period: string): Observable<PayrollRun> {
    return this.http.post<ApiResponse<PayrollRun>>(`${this.BASE}/payroll-runs`, { period })
      .pipe(map(r => r.data), catchError(this.handleError));
  }

  /**
   * Lance le calcul de paie pour une période.
   * Le backend encapsule tout dans prisma.$transaction()
   */
  calculatePayroll(runId: string): Observable<PayrollRun> {
    return this.http.post<ApiResponse<PayrollRun>>(`${this.BASE}/payroll-runs/${runId}/calculate`, {})
      .pipe(map(r => r.data), catchError(this.handleError));
  }

  lockPayrollRun(runId: string): Observable<PayrollRun> {
    return this.http.post<ApiResponse<PayrollRun>>(`${this.BASE}/payroll-runs/${runId}/lock`, {})
      .pipe(map(r => r.data), catchError(this.handleError));
  }

  resetPayrollRun(runId: string): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.BASE}/payroll-runs/${runId}/reset`, {})
      .pipe(map(() => void 0), catchError(this.handleError));
  }

  // ─── PAYSLIPS ─────────────────────────────────────────────

  getPayslipsByRun(runId: string): Observable<Payslip[]> {
    return this.http.get<ApiResponse<Payslip[]>>(`${this.BASE}/payroll-runs/${runId}/payslips`)
      .pipe(map(r => r.data), catchError(this.handleError));
  }

  getPayslipById(id: string): Observable<Payslip> {
    return this.http.get<ApiResponse<Payslip>>(`${this.BASE}/payslips/${id}`)
      .pipe(map(r => r.data), catchError(this.handleError));
  }

  getPayslipsByEmployee(employeeId: string): Observable<Payslip[]> {
    return this.http.get<ApiResponse<Payslip[]>>(`${this.BASE}/employees/${employeeId}/payslips`)
      .pipe(map(r => r.data), catchError(this.handleError));
  }

  // ─── SALARY VARIABLES ─────────────────────────────────────

  getSalaryVariables(employeeId: string, period?: string): Observable<SalaryVariable[]> {
    let params = new HttpParams();
    if (period) params = params.set('period', period);
    return this.http.get<ApiResponse<SalaryVariable[]>>(`${this.BASE}/employees/${employeeId}/variables`, { params })
      .pipe(map(r => r.data), catchError(this.handleError));
  }

  createSalaryVariable(variable: Partial<SalaryVariable>): Observable<SalaryVariable> {
    return this.http.post<ApiResponse<SalaryVariable>>(`${this.BASE}/salary-variables`, variable)
      .pipe(map(r => r.data), catchError(this.handleError));
  }

  // ─── EMPLOYEES ────────────────────────────────────────────

  getEmployees(): Observable<Employee[]> {
    return this.http.get<ApiResponse<Employee[]>>(`${this.BASE}/employees`)
      .pipe(map(r => r.data), catchError(this.handleError));
  }

  // ─── ERROR HANDLER ────────────────────────────────────────

  private handleError(error: any): Observable<never> {
    const message = error?.error?.message || error?.message || 'Erreur inconnue';
    console.error('[PayrollApiService]', message, error);
    return throwError(() => new Error(message));
  }
}