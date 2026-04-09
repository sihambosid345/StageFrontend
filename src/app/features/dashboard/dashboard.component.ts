import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { EmployeeService, DepartmentService, CompanyService, AttendanceService, PayrollPeriodService, ContractService } from '../../core/services/domain.services';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  stats = { employees: 0, departments: 0, companies: 0, attendances: 0, periods: 0, contracts: 0 };
  loading = true;

  constructor(
    private employeeService: EmployeeService,
    private departmentService: DepartmentService,
    private companyService: CompanyService,
    private attendanceService: AttendanceService,
    private periodService: PayrollPeriodService,
    private contractService: ContractService,
  ) {}

  ngOnInit() {
    forkJoin({
      employees: this.employeeService.getAll(),
      departments: this.departmentService.getAll(),
      companies: this.companyService.getAll(),
      attendances: this.attendanceService.getAll(),
      periods: this.periodService.getAll(),
      contracts: this.contractService.getAll(),
    }).subscribe({
      next: (data) => {
        this.stats.employees = data.employees.length;
        this.stats.departments = data.departments.length;
        this.stats.companies = data.companies.length;
        this.stats.attendances = data.attendances.length;
        this.stats.periods = data.periods.length;
        this.stats.contracts = data.contracts.length;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }
}
