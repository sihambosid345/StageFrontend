import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { authGuard, permissionGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'unauthorized',
    loadComponent: () => import('./features/auth/unauthorized.component').then(m => m.UnauthorizedComponent)
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        canActivate: [permissionGuard('dashboard')],
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'companies',
        canActivate: [permissionGuard('companies')],
        loadComponent: () => import('./features/companies/companies.component').then(m => m.CompaniesComponent)
      },
      {
        path: 'departments',
        canActivate: [permissionGuard('organisation')],
        loadComponent: () => import('./features/departments/departments.component').then(m => m.DepartmentsComponent)
      },
      {
        path: 'positions',
        canActivate: [permissionGuard('organisation')],
        loadComponent: () => import('./features/positions/positions.component').then(m => m.PositionsComponent)
      },
      {
        path: 'employees',
        canActivate: [permissionGuard('employees')],
        loadComponent: () => import('./features/employees/employees.component').then(m => m.EmployeesComponent)
      },
      {
        path: 'attendance',
        canActivate: [permissionGuard('attendance')],
        loadComponent: () => import('./features/attendance/attendance.component').then(m => m.AttendanceComponent)
      },
      {
        path: 'contracts',
        canActivate: [permissionGuard('contracts')],
        loadComponent: () => import('./features/contracts/contracts.component').then(m => m.ContractsComponent)
      },
      {
        path: 'licenses',
        canActivate: [permissionGuard('licenses')],
        loadComponent: () => import('./features/licenses/licenses.component').then(m => m.LicensesComponent)
      },
      {
        path: 'payroll/config',
        canActivate: [permissionGuard('payroll')],
        loadComponent: () => import('./features/payroll/config/config.component').then(m => m.PayrollConfigComponent)
      },
      {
        path: 'payroll/periods',
        canActivate: [permissionGuard('payroll')],
        loadComponent: () => import('./features/payroll/periods/periods.component').then(m => m.PeriodsComponent)
      },
      // ─── PAYROLL RUNS ───────────────────────────────────────
      {
        path: 'payroll/runs',
        canActivate: [permissionGuard('payroll')],
        loadComponent: () => import('./features/payroll/runs/runs.component').then(m => m.PayrollRunsComponent)
      },
      // FIX : Route calcul (était manquante → causait redirect vers dashboard)
      {
        path: 'payroll/runs/:id/calculate',
        canActivate: [permissionGuard('payroll')],
        loadComponent: () => import('./features/payroll/runs/calculate/calculate.component')
          .then(m => m.CalculateRunComponent)
      },
      // FIX : payslips est dans payroll/payslips/ (pas dans runs/payslips/)
      {
        path: 'payroll/runs/:id/payslips',
        canActivate: [permissionGuard('payroll')],
        loadComponent: () => import('./features/payroll/payslips/payslips.component')
          .then(m => m.PayslipsComponent)
      },
      // ────────────────────────────────────────────────────────
      {
        path: 'payroll/items',
        canActivate: [permissionGuard('payroll')],
        loadComponent: () => import('./features/payroll/items/items.component').then(m => m.ItemsComponent)
      },
      {
        path: 'payroll/payslips',
        canActivate: [permissionGuard('payroll')],
        loadComponent: () => import('./features/payroll/payslips/payslips.component').then(m => m.PayslipsComponent)
      },
      {
        path: 'payroll/statutory-rates',
        canActivate: [permissionGuard('payroll')],
        loadComponent: () => import('./features/payroll/statutory-rates/statutory-rates.component')
          .then(m => m.StatutoryRatesComponent)
      },
      {
        path: 'payroll/tax-brackets',
        canActivate: [permissionGuard('payroll')],
        loadComponent: () => import('./features/payroll/tax/tax-brackets.component')
          .then(m => m.TaxBracketsComponent)
      },
      {
        path: 'variable-items',
        canActivate: [permissionGuard('contracts')],
        loadComponent: () => import('./features/variable-items/variable-items.component')
          .then(m => m.VariableItemsComponent)
      },
      {
        path: 'recurring-items',
        canActivate: [permissionGuard('payroll')],
        loadComponent: () => import('./features/recurring-items/recurring-items.component')
          .then(m => m.RecurringItemsComponent)
      },
      {
        path: 'users',
        canActivate: [permissionGuard('users')],
        loadComponent: () => import('./features/users/users.component').then(m => m.UsersComponent)
      }
    ]
  },
  { path: '**', redirectTo: '/login' }
];