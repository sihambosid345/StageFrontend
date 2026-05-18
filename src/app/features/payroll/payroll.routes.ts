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
  // Route calcul run
  {
    path: 'runs/:id/calculate',
    loadComponent: () => import('./runs/calculate/calculate.component').then(m => m.CalculateRunComponent)
  },
  // Route liste bulletins d'un run
  {
    path: 'runs/:runId/payslips',
    loadComponent: () => import('./payslips/payslips.component').then(m => m.PayslipsComponent)
  },
  // Route détail bulletin
  {
    path: 'runs/:runId/payslips/:payslipId',
    loadComponent: () => import('./payslips/payslip-details.component').then(m => m.PayslipDetailsComponent)
  },
  {
    path: 'periods',
    loadComponent: () => import('./periods/periods.component').then(m => m.PeriodsComponent)
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
    path: 'statutory-rates',
    loadComponent: () => import('./statutory-rates/statutory-rates.component').then(m => m.StatutoryRatesComponent)
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