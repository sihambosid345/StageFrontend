import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'loading';
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toasts: Toast[] = [];
  private toastSubject = new BehaviorSubject<Toast[]>([]);
  private toastCounter = 0;
  private toastTimers: Map<string, any> = new Map();

  constructor(private ngZone: NgZone) {}

  getToasts(): Observable<Toast[]> {
    return this.toastSubject.asObservable();
  }

  /**
   * Afficher un toast de manière sécurisée (évite ExpressionChangedAfterItHasBeenCheckedError)
   */
  show(message: string, type: Toast['type'] = 'info', duration = 5000): string {
    const toast: Toast = {
      id: `toast-${++this.toastCounter}`,
      message,
      type,
      duration
    };

    // CRITIQUE: Utiliser setTimeout pour sortir du cycle de détection de changement actuel
    setTimeout(() => {
      this.ngZone.run(() => {
        this.toasts.push(toast);
        this.toastSubject.next([...this.toasts]);

        if (duration > 0) {
          const timer = setTimeout(() => {
            this.remove(toast.id);
          }, duration);
          this.toastTimers.set(toast.id, timer);
        }
      });
    }, 0);

    return toast.id;
  }

  /**
   * Toast de chargement persistant (duration 0 = pas de suppression automatique)
   */
  loading(message: string): string {
    return this.show(message, 'loading', 0);
  }

  /**
   * Toast de succès
   */
  success(message: string, duration = 5000): string {
    return this.show(message, 'success', duration);
  }

  /**
   * Toast d'erreur
   */
  error(message: string, duration = 8000): string {
    return this.show(message, 'error', duration);
  }

  /**
   * Toast d'avertissement
   */
  warning(message: string, duration = 6000): string {
    return this.show(message, 'warning', duration);
  }

  /**
   * Toast d'information
   */
  info(message: string, duration = 5000): string {
    return this.show(message, 'info', duration);
  }

  /**
   * Mettre à jour un toast existant
   */
  update(id: string, newMessage: string, newType?: Toast['type'], newDuration = 5000): void {
    setTimeout(() => {
      this.ngZone.run(() => {
        const toast = this.toasts.find(t => t.id === id);
        if (!toast) return;

        // Nettoyer l'ancien timer
        const existingTimer = this.toastTimers.get(id);
        if (existingTimer) {
          clearTimeout(existingTimer);
          this.toastTimers.delete(id);
        }

        // Mettre à jour le toast
        toast.message = newMessage;
        if (newType) toast.type = newType;
        toast.duration = newDuration;

        this.toastSubject.next([...this.toasts]);

        // Nouveau timer si durée > 0
        if (newDuration > 0) {
          const timer = setTimeout(() => {
            this.remove(id);
          }, newDuration);
          this.toastTimers.set(id, timer);
        }
      });
    }, 0);
  }

  /**
   * Transformer un toast loading en success/error
   */
  resolve(id: string, message: string, type: 'success' | 'error' = 'success'): void {
    this.update(id, message, type, 5000);
  }

  /**
   * Supprimer un toast spécifique
   */
  remove(id: string): void {
    setTimeout(() => {
      this.ngZone.run(() => {
        const timer = this.toastTimers.get(id);
        if (timer) {
          clearTimeout(timer);
          this.toastTimers.delete(id);
        }
        
        this.toasts = this.toasts.filter(t => t.id !== id);
        this.toastSubject.next([...this.toasts]);
      });
    }, 0);
  }

  /**
   * Supprimer tous les toasts
   */
  clear(): void {
    setTimeout(() => {
      this.ngZone.run(() => {
        this.toastTimers.forEach(timer => clearTimeout(timer));
        this.toastTimers.clear();
        this.toasts = [];
        this.toastSubject.next([]);
      });
    }, 0);
  }

  /**
   * Vérifier si un toast existe
   */
  hasToast(id: string): boolean {
    return this.toasts.some(t => t.id === id);
  }

  /**
   * Obtenir le nombre de toasts actifs
   */
  get count(): number {
    return this.toasts.length;
  }
}