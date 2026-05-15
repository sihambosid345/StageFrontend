// payroll.routes.ts
import { Routes } from '@angular/router';

export const PAYROLL_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'runs',
    pathMatch: 'full'
  },
  {
    path: 'runs',
    loadComponent: () => import('./runs/runs.component').then(m => m.PayrollRunsComponent)
  },
  {
    path: 'periods',
    loadComponent: () => import('./periods/periods.component').then(m => m.PeriodsComponent)
  },
  {
    path: 'payslips/:runId',
    loadComponent: () => import('./payslips/payslips.component').then(m => m.PayslipsComponent)
  },
  {
    path: 'payslips/:runId/:payslipId',
    loadComponent: () => import('./payslips/payslip-details.component').then(m => m.PayslipDetailsComponent)
  },
  {
    path: 'items',
    loadComponent: () => import('./items/items.component').then(m => m.ItemsComponent)
  },
  {
    path: 'rates',
    loadComponent: () => import('./rates/statutory-rates.component').then(m => m.StatutoryRatesComponent)
  },
  {
    path: 'tax-brackets',
    loadComponent: () => import('./tax/tax-brackets.component').then(m => m.TaxBracketsComponent)
  },
  {
    path: 'salary-types',
    loadComponent: () => import('./salary-types/salary-types.component').then(m => m.SalaryTypesComponent)
  },
  {
    path: 'config',
    loadComponent: () => import('./config/config.component').then(m => m.PayrollConfigComponent)
  }
];