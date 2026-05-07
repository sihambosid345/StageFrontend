// payroll.routes.ts
import { Routes } from '@angular/router';

export const PAYROLL_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'runs',
    pathMatch: 'full'
  },
  {
    path: 'config',
    loadComponent: () => import('./config/config.component').then(m => m.PayrollConfigComponent)
  }
];