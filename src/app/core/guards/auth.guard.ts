import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// ── Guard de base : utilisateur connecté ─────────────────────────────────────
export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) return true;
  router.navigate(['/login']);
  return false;
};

// ── Guard admin ───────────────────────────────────────────────────────────────
export const adminGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) { router.navigate(['/login']); return false; }
  if (auth.isAdmin())     return true;

  router.navigate(['/unauthorized']);
  return false;
};

// ── Guard par permission ──────────────────────────────────────────────────────
/**
 * Règles :
 * - Super admin → accès à tout, toujours
 * - 'licenses' et 'companies' → super admin uniquement
 * - Autres → vérification dans le tableau permissions[]
 */
export const permissionGuard = (permission: string): CanActivateFn => () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  // Non connecté
  if (!auth.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  // Super admin a accès à tout
  if (auth.isSuperAdmin()) return true;

  // Sections réservées au super admin
  if (permission === 'licenses' || permission === 'companies') {
    router.navigate(['/unauthorized']);
    return false;
  }

  // Vérification des permissions normales
  const permissions = auth.getPermissions() ?? [];
  if (permissions.includes(permission)) return true;

  router.navigate(['/unauthorized']);
  return false;
};