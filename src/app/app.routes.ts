import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { authGuard, adminGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Public routes
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'unauthorized',
    loadComponent: () => import('./features/auth/unauthorized.component').then(m => m.UnauthorizedComponent)
  },

  // Protected routes (admin only)
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',       loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'companies',       loadComponent: () => import('./features/companies/companies.component').then(m => m.CompaniesComponent) },
      { path: 'departments',     loadComponent: () => import('./features/departments/departments.component').then(m => m.DepartmentsComponent) },
      { path: 'positions',       loadComponent: () => import('./features/positions/positions.component').then(m => m.PositionsComponent) },
      { path: 'employees',       loadComponent: () => import('./features/employees/employees.component').then(m => m.EmployeesComponent) },
      { path: 'attendance',      loadComponent: () => import('./features/attendance/attendance.component').then(m => m.AttendanceComponent) },
      { path: 'contracts',       loadComponent: () => import('./features/contracts/contracts.component').then(m => m.ContractsComponent) },
      { path: 'licenses',        loadComponent: () => import('./features/licenses/licenses.component').then(m => m.LicensesComponent) },
      { path: 'payroll/periods', loadComponent: () => import('./features/payroll/periods/periods.component').then(m => m.PeriodsComponent) },
      { path: 'payroll/runs',    loadComponent: () => import('./features/payroll/runs/runs.component').then(m => m.RunsComponent) },
      { path: 'payroll/items',   loadComponent: () => import('./features/payroll/items/items.component').then(m => m.ItemsComponent) },
      { path: 'payroll/payslips',loadComponent: () => import('./features/payroll/payslips/payslips.component').then(m => m.PayslipsComponent) },
      { path: 'variable-items',  loadComponent: () => import('./features/variable-items/variable-items.component').then(m => m.VariableItemsComponent) },
      { path: 'users',           loadComponent: () => import('./features/users/users.component').then(m => m.UsersComponent) },
    ]
  },

  { path: '**', redirectTo: '/login' }
];
