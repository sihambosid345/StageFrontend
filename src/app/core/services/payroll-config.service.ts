import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PayrollConfig {
  id: string;
  companyId: string;
  regime: string;
  currency: string;
  weeklyHours: number | null;
  monthlyHours: number | null;
  workingDaysPerMonth: number | null;
  cnssEnabled: boolean;
  amoEnabled: boolean;
  irEnabled: boolean;
  cimrEnabled: boolean;
  defaultCnssDeclaredDays: number | null;
  payslipTemplate?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  company?: {
    id: string;
    name: string;
    status: string;
  };
}

@Injectable({ providedIn: 'root' })
export class PayrollConfigService {
  private apiUrl = 'http://localhost:3000/payroll-config'; // ✅ بلا /api

  constructor(private http: HttpClient) {}

  getMyConfig(): Observable<PayrollConfig> {
    return this.http.get<PayrollConfig>(this.apiUrl);
  }

  getAllConfigs(): Observable<PayrollConfig[]> {
    return this.http.get<PayrollConfig[]>(`${this.apiUrl}/all`);
  }

  createConfig(data: Partial<PayrollConfig>): Observable<PayrollConfig> {
    return this.http.post<PayrollConfig>(this.apiUrl, data);
  }

  updateMyConfig(data: Partial<PayrollConfig>): Observable<PayrollConfig> {
    return this.http.put<PayrollConfig>(this.apiUrl, data);
  }

  updateConfig(id: string, data: Partial<PayrollConfig>): Observable<PayrollConfig> {
    return this.http.put<PayrollConfig>(`${this.apiUrl}/${id}`, data);
  }

  upsertConfig(data: Partial<PayrollConfig>): Observable<PayrollConfig> {
    return this.http.post<PayrollConfig>(`${this.apiUrl}/upsert`, data);
  }

  deleteConfig(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}