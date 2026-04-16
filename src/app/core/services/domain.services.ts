import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';
import {
  Company, Department, Position, Employee, Attendance,
  EmployeeContract, License, PayrollPeriod, PayrollRun,
  PayrollItem, Payslip, VariableItem, User
} from '../models';

// ─── Super Admin Service ──────────────────────────────────────────────────────
// Toutes les opérations réservées au super admin passent par /super-admin/*
@Injectable({ providedIn: 'root' })
export class SuperAdminService {
  constructor(private api: ApiService) {}

  // Crée une entreprise + licence TRIAL automatiquement (transaction backend)
  createCompanyWithLicense(data: Partial<Company>): Observable<{
    message: string;
    company: Company;
    license: License;
  }> {
    return this.api.post('/super-admin/companies', data);
  }

  // Récupère toutes les entreprises (vue super admin avec licence et nb users)
  getAllCompanies(): Observable<{ total: number; companies: any[] }> {
    return this.api.get('/super-admin/companies');
  }

  // Crée ou met à jour la licence d'une entreprise
  createOrUpdateLicense(data: Partial<License>): Observable<{ message: string; license: License }> {
    return this.api.post('/super-admin/licenses', data);
  }

  // Crée un admin d'entreprise
  createCompanyAdmin(data: {
    companyId: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
  }): Observable<{ message: string; user: User }> {
    return this.api.post('/super-admin/company-admins', data);
  }

  // Récupère les utilisateurs d'une entreprise spécifique
  getCompanyUsers(companyId: string): Observable<{ total: number; users: User[] }> {
    return this.api.get(`/super-admin/companies/${companyId}/users`);
  }
}

// ─── Company Service ───────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class CompanyService {
  constructor(private api: ApiService, private auth: AuthService) {}

  getAll(): Observable<Company[]> {
    return this.auth.isSuperAdmin()
      ? this.api.get('/companies')
      : this.api.get('/companies/mine');
  }

  getById(id: string): Observable<Company> { return this.api.get(`/companies/${id}`); }
  create(data: Partial<Company>): Observable<Company> { return this.api.post('/companies', data); }
  update(id: string, data: Partial<Company>): Observable<Company> { return this.api.put(`/companies/${id}`, data); }
  delete(id: string): Observable<any> { return this.api.delete(`/companies/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class DepartmentService {
  constructor(private api: ApiService) {}
  getAll(): Observable<Department[]> { return this.api.get('/departments'); }
  getById(id: string): Observable<Department> { return this.api.get(`/departments/${id}`); }
  create(data: Partial<Department>): Observable<Department> { return this.api.post('/departments', data); }
  update(id: string, data: Partial<Department>): Observable<Department> { return this.api.put(`/departments/${id}`, data); }
  delete(id: string): Observable<any> { return this.api.delete(`/departments/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class PositionService {
  constructor(private api: ApiService) {}
  getAll(): Observable<Position[]> { return this.api.get('/positions'); }
  getById(id: string): Observable<Position> { return this.api.get(`/positions/${id}`); }
  create(data: Partial<Position>): Observable<Position> { return this.api.post('/positions', data); }
  update(id: string, data: Partial<Position>): Observable<Position> { return this.api.put(`/positions/${id}`, data); }
  delete(id: string): Observable<any> { return this.api.delete(`/positions/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  constructor(private api: ApiService) {}
  getAll(): Observable<Employee[]> { return this.api.get('/employees'); }
  getById(id: string): Observable<Employee> { return this.api.get(`/employees/${id}`); }
  create(data: Partial<Employee>): Observable<Employee> { return this.api.post('/employees', data); }
  update(id: string, data: Partial<Employee>): Observable<Employee> { return this.api.put(`/employees/${id}`, data); }
  delete(id: string): Observable<any> { return this.api.delete(`/employees/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  constructor(private api: ApiService) {}
  getAll(): Observable<Attendance[]> { return this.api.get('/attendances'); }
  getById(id: string): Observable<Attendance> { return this.api.get(`/attendances/${id}`); }
  getByEmployee(employeeId: string): Observable<Attendance[]> { return this.api.get(`/attendances/employee/${employeeId}`); }
  create(data: Partial<Attendance>): Observable<Attendance> { return this.api.post('/attendances', data); }
  update(id: string, data: Partial<Attendance>): Observable<Attendance> { return this.api.put(`/attendances/${id}`, data); }
  delete(id: string): Observable<any> { return this.api.delete(`/attendances/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class ContractService {
  constructor(private api: ApiService) {}
  getAll(): Observable<EmployeeContract[]> { return this.api.get('/contracts'); }
  getById(id: string): Observable<EmployeeContract> { return this.api.get(`/contracts/${id}`); }
  getByEmployee(employeeId: string): Observable<EmployeeContract[]> { return this.api.get(`/contracts/employee/${employeeId}`); }
  create(data: Partial<EmployeeContract>): Observable<EmployeeContract> { return this.api.post('/contracts', data); }
  update(id: string, data: Partial<EmployeeContract>): Observable<EmployeeContract> { return this.api.put(`/contracts/${id}`, data); }
  delete(id: string): Observable<any> { return this.api.delete(`/contracts/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class LicenseService {
  constructor(private api: ApiService) {}
  getAll(): Observable<License[]> { return this.api.get('/licenses'); }
  getById(id: string): Observable<License> { return this.api.get(`/licenses/${id}`); }
  getByCompany(companyId: string): Observable<License[]> { return this.api.get(`/licenses/company/${companyId}`); }
  create(data: Partial<License>): Observable<License> { return this.api.post('/licenses', data); }
  update(id: string, data: Partial<License>): Observable<License> { return this.api.put(`/licenses/${id}`, data); }
  delete(id: string): Observable<any> { return this.api.delete(`/licenses/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class PayrollPeriodService {
  constructor(private api: ApiService) {}
  getAll(): Observable<PayrollPeriod[]> { return this.api.get('/payroll-periods'); }
  getById(id: string): Observable<PayrollPeriod> { return this.api.get(`/payroll-periods/${id}`); }
  create(data: Partial<PayrollPeriod>): Observable<PayrollPeriod> { return this.api.post('/payroll-periods', data); }
  update(id: string, data: Partial<PayrollPeriod>): Observable<PayrollPeriod> { return this.api.put(`/payroll-periods/${id}`, data); }
  delete(id: string): Observable<any> { return this.api.delete(`/payroll-periods/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class PayrollRunService {
  constructor(private api: ApiService) {}
  getAll(): Observable<PayrollRun[]> { return this.api.get('/payroll-runs'); }
  getById(id: string): Observable<PayrollRun> { return this.api.get(`/payroll-runs/${id}`); }
  getByPeriod(periodId: string): Observable<PayrollRun[]> { return this.api.get(`/payroll-runs/period/${periodId}`); }
  create(data: Partial<PayrollRun>): Observable<PayrollRun> { return this.api.post('/payroll-runs', data); }
  update(id: string, data: Partial<PayrollRun>): Observable<PayrollRun> { return this.api.put(`/payroll-runs/${id}`, data); }
  delete(id: string): Observable<any> { return this.api.delete(`/payroll-runs/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class PayrollItemService {
  constructor(private api: ApiService) {}
  getAll(): Observable<PayrollItem[]> { return this.api.get('/payroll-items'); }
  getById(id: string): Observable<PayrollItem> { return this.api.get(`/payroll-items/${id}`); }
  getByRun(runId: string): Observable<PayrollItem[]> { return this.api.get(`/payroll-items/run/${runId}`); }
  getByEmployee(employeeId: string): Observable<PayrollItem[]> { return this.api.get(`/payroll-items/employee/${employeeId}`); }
  create(data: Partial<PayrollItem>): Observable<PayrollItem> { return this.api.post('/payroll-items', data); }
  update(id: string, data: Partial<PayrollItem>): Observable<PayrollItem> { return this.api.put(`/payroll-items/${id}`, data); }
  delete(id: string): Observable<any> { return this.api.delete(`/payroll-items/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class PayslipService {
  constructor(private api: ApiService) {}
  getAll(): Observable<Payslip[]> { return this.api.get('/payslips'); }
  getById(id: string): Observable<Payslip> { return this.api.get(`/payslips/${id}`); }
  getByEmployee(employeeId: string): Observable<Payslip[]> { return this.api.get(`/payslips/employee/${employeeId}`); }
  getByPeriod(periodId: string): Observable<Payslip[]> { return this.api.get(`/payslips/period/${periodId}`); }
  create(data: Partial<Payslip>): Observable<Payslip> { return this.api.post('/payslips', data); }
  update(id: string, data: Partial<Payslip>): Observable<Payslip> { return this.api.put(`/payslips/${id}`, data); }
  delete(id: string): Observable<any> { return this.api.delete(`/payslips/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class VariableItemService {
  constructor(private api: ApiService) {}
  getAll(): Observable<VariableItem[]> { return this.api.get('/variable-items'); }
  getById(id: string): Observable<VariableItem> { return this.api.get(`/variable-items/${id}`); }
  getByEmployee(employeeId: string): Observable<VariableItem[]> { return this.api.get(`/variable-items/employee/${employeeId}`); }
  create(data: Partial<VariableItem>): Observable<VariableItem> { return this.api.post('/variable-items', data); }
  update(id: string, data: Partial<VariableItem>): Observable<VariableItem> { return this.api.put(`/variable-items/${id}`, data); }
  delete(id: string): Observable<any> { return this.api.delete(`/variable-items/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private api: ApiService) {}
  getAll(): Observable<User[]> { return this.api.get('/users'); }
  getById(id: string): Observable<User> { return this.api.get(`/users/${id}`); }
  create(data: Partial<User>): Observable<User> { return this.api.post('/users', data); }
  update(id: string, data: Partial<User>): Observable<User> { return this.api.put(`/users/${id}`, data); }
  delete(id: string): Observable<any> { return this.api.delete(`/users/${id}`); }
}