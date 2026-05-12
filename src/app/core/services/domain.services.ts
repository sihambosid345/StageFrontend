import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';
import {
  Company, Department, Position, Employee, Attendance,
  EmployeeContract, License, PayrollPeriod, PayrollRun,
  PayrollItem, Payslip, VariableItem, EmployeeRecurringItem, User
} from '../models';

// ── Interfaces pour le super admin ──────────────────────────────────────────

export interface SuperAdminDashboardStats {
  companies: { total: number; active: number; inactive: number };
  users:     { total: number };
  licenses:  { total: number; active: number; trial: number; expired: number };
}

export interface CompanyWithStats extends Company {
  license?: Partial<License>;
  _count?: { users: number; employees: number };
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class CompanyService {
  constructor(private api: ApiService, private auth: AuthService) {}

  getAll(): Observable<Company[]> {
    return this.auth.isSuperAdmin()
      ? this.api.get<Company[]>('/companies')
      : this.api.get<Company[]>('/companies/mine');
  }

  getById(id: string): Observable<Company>                    { return this.api.get(`/companies/${id}`); }
  create(data: Partial<Company>): Observable<Company>         { return this.api.post('/companies', data); }
  update(id: string, data: Partial<Company>): Observable<Company> { return this.api.put(`/companies/${id}`, data); }
  delete(id: string): Observable<any>                         { return this.api.delete(`/companies/${id}`); }
  
  /** NOUVEAU: Récupérer les départements d'une entreprise */
  getDepartments(companyId: string): Observable<Department[]> {
    return this.api.get(`/companies/${companyId}/departments`);
  }
  
  /** NOUVEAU: Récupérer les postes d'une entreprise */
  getPositions(companyId: string): Observable<Position[]> {
    return this.api.get(`/companies/${companyId}/positions`);
  }
}

@Injectable({ providedIn: 'root' })
export class DepartmentService {
  constructor(private api: ApiService) {}
  
  getAll(): Observable<Department[]>                              { return this.api.get('/departments'); }
  getById(id: string): Observable<Department>                    { return this.api.get(`/departments/${id}`); }
  
  /** NOUVEAU: Récupérer les départements par entreprise */
  getByCompany(companyId: string): Observable<Department[]> {
    return this.api.get(`/departments/company/${companyId}`);
  }
  
  create(data: Partial<Department>): Observable<Department>      { return this.api.post('/departments', data); }
  update(id: string, data: Partial<Department>): Observable<Department> { return this.api.put(`/departments/${id}`, data); }
  delete(id: string): Observable<any>                            { return this.api.delete(`/departments/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class PositionService {
  constructor(private api: ApiService) {}
  
  getAll(): Observable<Position[]>                             { return this.api.get('/positions'); }
  getById(id: string): Observable<Position>                   { return this.api.get(`/positions/${id}`); }
  
  /** NOUVEAU: Récupérer les postes par département */
  getByDepartment(departmentId: string): Observable<Position[]> {
    return this.api.get(`/positions/department/${departmentId}`);
  }
  
  /** NOUVEAU: Récupérer les postes par entreprise */
  getByCompany(companyId: string): Observable<Position[]> {
    return this.api.get(`/positions/company/${companyId}`);
  }
  
  create(data: Partial<Position>): Observable<Position>       { return this.api.post('/positions', data); }
  update(id: string, data: Partial<Position>): Observable<Position> { return this.api.put(`/positions/${id}`, data); }
  delete(id: string): Observable<any>                         { return this.api.delete(`/positions/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  constructor(private api: ApiService) {}
  getAll(): Observable<Employee[]>                             { return this.api.get('/employees'); }
  getById(id: string): Observable<Employee>                   { return this.api.get(`/employees/${id}`); }
  getByDepartments(departmentIds: string[]): Observable<Employee[]> { 
    const ids = departmentIds.join(',');
    return this.api.get(`/employees/by-departments?departmentIds=${ids}`);
  }
  create(data: Partial<Employee>): Observable<Employee>       { return this.api.post('/employees', data); }
  update(id: string, data: Partial<Employee>): Observable<Employee> { return this.api.put(`/employees/${id}`, data); }
  delete(id: string): Observable<any>                         { return this.api.delete(`/employees/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  constructor(private api: ApiService) {}
  getAll(): Observable<Attendance[]>                               { return this.api.get('/attendances'); }
  getById(id: string): Observable<Attendance>                     { return this.api.get(`/attendances/${id}`); }
  getByEmployee(employeeId: string): Observable<Attendance[]>     { return this.api.get(`/attendances/employee/${employeeId}`); }
  create(data: Partial<Attendance>): Observable<Attendance>       { return this.api.post('/attendances', data); }
  update(id: string, data: Partial<Attendance>): Observable<Attendance> { return this.api.put(`/attendances/${id}`, data); }
  delete(id: string): Observable<any>                             { return this.api.delete(`/attendances/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class ContractService {
  constructor(private api: ApiService) {}
  getAll(): Observable<EmployeeContract[]>                                { return this.api.get('/contracts'); }
  getById(id: string): Observable<EmployeeContract>                      { return this.api.get(`/contracts/${id}`); }
  getByEmployee(employeeId: string): Observable<EmployeeContract[]>      { return this.api.get(`/contracts/employee/${employeeId}`); }
  create(data: Partial<EmployeeContract>): Observable<EmployeeContract>  { return this.api.post('/contracts', data); }
  update(id: string, data: Partial<EmployeeContract>): Observable<EmployeeContract> { return this.api.put(`/contracts/${id}`, data); }
  delete(id: string): Observable<any>                                     { return this.api.delete(`/contracts/${id}`); }
  generatePdf(id: string): Observable<{message: string; filename: string; path: string}> { return this.api.post(`/contracts/${id}/generate-pdf`, {}); }
  downloadPdf(filename: string): Observable<Blob> { return this.api.get(`/contracts/pdf/${filename}`, { responseType: 'blob' }); }
}

@Injectable({ providedIn: 'root' })
export class LicenseService {
  constructor(private api: ApiService) {}
  getAll(): Observable<License[]>                           { return this.api.get('/licenses'); }
  getById(id: string): Observable<License>                 { return this.api.get(`/licenses/${id}`); }
  getByCompany(companyId: string): Observable<License>     { return this.api.get(`/licenses/company/${companyId}`); }
  create(data: Partial<License>): Observable<License>      { return this.api.post('/licenses', data); }
  update(id: string, data: Partial<License>): Observable<License> { return this.api.put(`/licenses/${id}`, data); }
  delete(id: string): Observable<any>                      { return this.api.delete(`/licenses/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class VariableItemService {
  constructor(private api: ApiService) {}
  getAll(): Observable<VariableItem[]>                                   { return this.api.get('/variable-items'); }
  getById(id: string): Observable<VariableItem>                         { return this.api.get(`/variable-items/${id}`); }
  getByEmployee(employeeId: string): Observable<VariableItem[]>         { return this.api.get(`/variable-items/employee/${employeeId}`); }
  create(data: Partial<VariableItem>): Observable<VariableItem>         { return this.api.post('/variable-items', data); }
  update(id: string, data: Partial<VariableItem>): Observable<VariableItem> { return this.api.put(`/variable-items/${id}`, data); }
  delete(id: string): Observable<any>                                   { return this.api.delete(`/variable-items/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class RecurringItemService {
  constructor(private api: ApiService) {}
  getAll(): Observable<EmployeeRecurringItem[]> { return this.api.get('/recurring-items'); }
  getById(id: string): Observable<EmployeeRecurringItem> { return this.api.get(`/recurring-items/${id}`); }
  getByEmployee(employeeId: string): Observable<EmployeeRecurringItem[]> {
    return this.api.get(`/recurring-items/employee/${employeeId}`);
  }
  create(data: Partial<EmployeeRecurringItem>): Observable<EmployeeRecurringItem> { return this.api.post('/recurring-items', data); }
  update(id: string, data: Partial<EmployeeRecurringItem>): Observable<EmployeeRecurringItem> {
    return this.api.put(`/recurring-items/${id}`, data);
  }
  delete(id: string): Observable<any> { return this.api.delete(`/recurring-items/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private api: ApiService) {}
  getAll(): Observable<User[]>                           { return this.api.get('/users'); }
  getById(id: string): Observable<User>                 { return this.api.get(`/users/${id}`); }
  create(data: Partial<User>): Observable<User>         { return this.api.post('/users', data); }
  update(id: string, data: Partial<User>): Observable<User> { return this.api.put(`/users/${id}`, data); }
  delete(id: string): Observable<any>                   { return this.api.delete(`/users/${id}`); }
}

// ── Services de paie (Payroll) ──────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class PayrollPeriodService {
  constructor(private api: ApiService) {}
  
  getAll(): Observable<PayrollPeriod[]> {
    return this.api.get('/payroll-periods');
  }
  
  getById(id: string): Observable<PayrollPeriod> {
    return this.api.get(`/payroll-periods/${id}`);
  }
  
  getByCompany(companyId: string): Observable<PayrollPeriod[]> {
    return this.api.get(`/payroll-periods/company/${companyId}`);
  }

  /** Vérifie si une période OPEN existe pour cette entreprise */
  getOpenPeriod(companyId: string): Observable<{ open: boolean; period: PayrollPeriod | null }> {
    return this.api.get(`/payroll-periods/open/${companyId}`);
  }
  
  create(data: Partial<PayrollPeriod>): Observable<PayrollPeriod> {
    return this.api.post('/payroll-periods', data);
  }
  
  update(id: string, data: Partial<PayrollPeriod>): Observable<PayrollPeriod> {
    return this.api.put(`/payroll-periods/${id}`, data);
  }
  
  delete(id: string): Observable<any> {
    return this.api.delete(`/payroll-periods/${id}`);
  }
  
  /** Clôture une période et ouvre automatiquement la suivante */
  closePeriod(id: string): Observable<{ closed: PayrollPeriod; opened: PayrollPeriod | null; message: string }> {
    return this.api.post(`/payroll-periods/${id}/close`, {});
  }
}

@Injectable({ providedIn: 'root' })
export class PayrollRunService {
  constructor(private api: ApiService) {}
  
  getAll(): Observable<PayrollRun[]> {
    return this.api.get('/payroll-runs');
  }
  
  getById(id: string): Observable<PayrollRun> {
    return this.api.get(`/payroll-runs/${id}`);
  }
  
  getByPeriod(periodId: string): Observable<PayrollRun[]> {
    return this.api.get(`/payroll-runs/period/${periodId}`);
  }
  
  getByCompany(companyId: string): Observable<PayrollRun[]> {
    return this.api.get(`/payroll-runs/company/${companyId}`);
  }
  
  create(data: Partial<PayrollRun>): Observable<PayrollRun> {
    return this.api.post('/payroll-runs', data);
  }
  
  update(id: string, data: Partial<PayrollRun>): Observable<PayrollRun> {
    return this.api.put(`/payroll-runs/${id}`, data);
  }
  
  delete(id: string): Observable<any> {
    return this.api.delete(`/payroll-runs/${id}`);
  }
  
  processRun(id: string): Observable<PayrollRun> {
    return this.api.post(`/payroll-runs/${id}/process`, {});
  }
  
  approveRun(id: string): Observable<PayrollRun> {
    return this.api.post(`/payroll-runs/${id}/approve`, {});
  }
}

@Injectable({ providedIn: 'root' })
export class PayrollItemService {
  constructor(private api: ApiService) {}
  
  getAll(): Observable<PayrollItem[]> {
    return this.api.get('/payroll-items');
  }
  
  getById(id: string): Observable<PayrollItem> {
    return this.api.get(`/payroll-items/${id}`);
  }
  
  getByRun(runId: string): Observable<PayrollItem[]> {
    return this.api.get(`/payroll-items/run/${runId}`);
  }
  
  getByEmployee(employeeId: string): Observable<PayrollItem[]> {
    return this.api.get(`/payroll-items/employee/${employeeId}`);
  }
  
  create(data: Partial<PayrollItem>): Observable<PayrollItem> {
    return this.api.post('/payroll-items', data);
  }
  
  update(id: string, data: Partial<PayrollItem>): Observable<PayrollItem> {
    return this.api.put(`/payroll-items/${id}`, data);
  }
  
  delete(id: string): Observable<any> {
    return this.api.delete(`/payroll-items/${id}`);
  }
  
  bulkCreate(items: Partial<PayrollItem>[]): Observable<PayrollItem[]> {
    return this.api.post('/payroll-items/bulk', { items });
  }
}

@Injectable({ providedIn: 'root' })
export class PayslipService {
  constructor(private api: ApiService) {}
  
  getAll(): Observable<Payslip[]> {
    return this.api.get('/payslips');
  }
  
  getById(id: string): Observable<Payslip> {
    return this.api.get(`/payslips/${id}`);
  }
  
  getByRun(runId: string): Observable<Payslip[]> {
    return this.api.get(`/payslips/run/${runId}`);
  }
  
  getByEmployee(employeeId: string): Observable<Payslip[]> {
    return this.api.get(`/payslips/employee/${employeeId}`);
  }
  
  // Méthodes CRUD ajoutées
  create(data: Partial<Payslip>): Observable<Payslip> {
    return this.api.post('/payslips', data);
  }
  
  update(id: string, data: Partial<Payslip>): Observable<Payslip> {
    return this.api.put(`/payslips/${id}`, data);
  }
  
  generatePayslip(runId: string, employeeId: string): Observable<Payslip> {
    return this.api.post(`/payslips/generate`, { runId, employeeId });
  }
  
  generateAllForRun(runId: string): Observable<Payslip[]> {
    return this.api.post(`/payslips/generate-all/${runId}`, {});
  }
  
  downloadPdf(id: string): Observable<Blob> {
    return this.api.get(`/payslips/${id}/pdf`, { responseType: 'blob' });
  }
  
  sendByEmail(id: string): Observable<{ message: string }> {
    return this.api.post(`/payslips/${id}/send-email`, {});
  }
  
  delete(id: string): Observable<any> {
    return this.api.delete(`/payslips/${id}`);
  }
}

// ── Service Super Admin ─────────────────────────────────────────────────────

/**
 * Service dédié au super admin
 * Utilise les routes /super-admin/* pour les opérations d'administration globale
 */
@Injectable({ providedIn: 'root' })
export class SuperAdminService {
  constructor(private api: ApiService) {}

  getDashboardStats(): Observable<SuperAdminDashboardStats> {
    return this.api.get('/super-admin/dashboard');
  }

  getAllCompanies(): Observable<{ total: number; companies: CompanyWithStats[] }> {
    return this.api.get('/super-admin/companies');
  }

  createCompany(data: Partial<Company>): Observable<{ message: string; company: Company }> {
    return this.api.post('/super-admin/companies', data);
  }

  getCompanyUsers(companyId: string): Observable<{ company: { id: string; name: string }; total: number; users: User[] }> {
    return this.api.get(`/super-admin/companies/${companyId}/users`);
  }

  createCompanyAdmin(data: {
    companyId: string; firstName: string; lastName: string;
    email: string; password: string; phone?: string;
  }): Observable<{ message: string; user: User }> {
    return this.api.post('/super-admin/company-admins', data);
  }

  createOrUpdateLicense(data: Partial<License>): Observable<{ message: string; license: License }> {
    return this.api.post('/super-admin/licenses', data);
  }

  createCompanyWithLicenseAndUsers(data: {
    company: Partial<Company>;
    license: Partial<License>;
    users: Array<{
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      phone?: string;
      role?: string;
      status?: string;
      permissions?: string[];
    }>;
  }): Observable<{ message: string; data: { company: Company; license: License; users: User[] } }> {
    return this.api.post('/super-admin/companies-with-license-and-users', data);
  }

  generateContract(data: any): Observable<string> {
    return this.api.post('/super-admin/generate-contract', data, { responseType: 'text' });
  }
}