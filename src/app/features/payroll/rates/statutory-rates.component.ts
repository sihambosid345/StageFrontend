import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-statutory-rates',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Taux Statutaires</h1>
          <p class="page-subtitle">Gestion des taux CNSS, AMO, CIMR, IR et autres cotisations sociales — lecture depuis la base de données</p>
        </div>
        <button class="btn-primary" (click)="openForm()">+ Nouveau taux</button>
      </div>

      <!-- Filtre date -->
      <div class="filter-bar">
        <label>Date de référence</label>
        <input type="date" [(ngModel)]="filterDate" (change)="loadRates()" class="form-input-sm">
        <span class="tag-info">
          {{ rates.length }} taux actif(s) au {{ filterDate }}
        </span>
      </div>

      <!-- Tableau taux -->
      <div class="card">
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>CODE</th>
                <th>LIBELLÉ</th>
                <th>TAUX (%)</th>
                <th>PLAFOND (MAD)</th>
                <th>EFFECTIF DU</th>
                <th>EFFECTIF AU</th>
                <th>VERSION</th>
                <th>STATUT</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="loading">
                <td colspan="9" class="loading-cell"><div class="spinner"></div> Chargement...</td>
              </tr>
              <tr *ngIf="!loading && rates.length === 0">
                <td colspan="9" class="empty-cell">
                  <div class="empty-state">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <p>Aucun taux configuré pour le {{ filterDate }}</p>
                    <button class="btn-primary" (click)="openForm()">Créer le premier taux</button>
                  </div>
                </td>
              </tr>
              <tr *ngFor="let rate of rates" class="table-row">
                <td><span class="code-badge">{{ rate.code }}</span></td>
                <td>{{ rate.label }}</td>
                <td><span class="rate-pill">{{ (rate.rate * 100) | number:'1.0-2' }}%</span></td>
                <td class="amount">{{ rate.ceiling ? (rate.ceiling | number:'1.0-0') : '—' }}</td>
                <td>{{ rate.effectiveFrom | date:'dd/MM/yyyy' }}</td>
                <td>{{ rate.effectiveTo ? (rate.effectiveTo | date:'dd/MM/yyyy') : '∞' }}</td>
                <td><span class="version-badge">v{{ rate.version }}</span></td>
                <td>
                  <span class="status-dot" [class.active]="rate.isActive" [class.inactive]="!rate.isActive">
                    {{ rate.isActive ? 'Actif' : 'Inactif' }}
                  </span>
                </td>
                <td class="actions-cell">
                  <button class="action-btn btn-edit" (click)="editRate(rate)" title="Modifier">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button class="action-btn btn-delete" (click)="deleteRate(rate)" title="Supprimer">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal formulaire -->
      <div class="modal-overlay" *ngIf="showForm" (click)="closeForm()" @fadeInOut>
        <div class="modal-dialog" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ editingRate?.id ? 'Modifier taux' : 'Nouveau taux' }}</h2>
            <button class="btn-close" (click)="closeForm()">×</button>
          </div>

          <form [formGroup]="form" (ngSubmit)="saveRate()" class="modal-body">
            <div class="form-group">
              <label for="code" class="required">Code</label>
              <select id="code" formControlName="code" class="form-control" [disabled]="!!editingRate?.id">
                <option value="">-- Sélectionner --</option>
                <option value="CNSS_EMPLOYEE">CNSS Salarié</option>
                <option value="CNSS_EMPLOYER">CNSS Employeur</option>
                <option value="AMO_EMPLOYEE">AMO Salarié</option>
                <option value="AMO_EMPLOYER">AMO Employeur</option>
                <option value="CIMR_EMPLOYEE">CIMR Salarié</option>
                <option value="CIMR_EMPLOYER">CIMR Employeur</option>
                <option value="TRAINING_TAX">Taxe de Formation Professionnelle</option>
                <option value="FAMILY_ALLOWANCE">Allocations Familiales</option>
                <option value="SOCIAL_BENEFITS">Prestations Sociales</option>
                <option value="DAMANCOM">DAMANCOM</option>
              </select>
              <div class="form-error" *ngIf="form.get('code')?.invalid && form.get('code')?.touched">Code requis</div>
            </div>

            <div class="form-group">
              <label for="label" class="required">Libellé</label>
              <input id="label" type="text" formControlName="label" class="form-control" placeholder="Ex: Cotisation CNSS Salarié">
              <div class="form-error" *ngIf="form.get('label')?.invalid && form.get('label')?.touched">Libellé requis</div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="rate" class="required">Taux (%)</label>
                <input id="rate" type="number" formControlName="rate" class="form-control" placeholder="4.48" step="0.01" min="0" max="100">
                <div class="form-error" *ngIf="form.get('rate')?.invalid && form.get('rate')?.touched">Taux requis (0-100)</div>
              </div>

              <div class="form-group">
                <label for="ceiling">Plafond Mensuel (MAD)</label>
                <input id="ceiling" type="number" formControlName="ceiling" class="form-control" placeholder="6000" min="0">
                <small class="form-help">Optionnel — pour CNSS salarié uniquement</small>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="effectiveFrom" class="required">Effectif du</label>
                <input id="effectiveFrom" type="date" formControlName="effectiveFrom" class="form-control">
                <div class="form-error" *ngIf="form.get('effectiveFrom')?.invalid && form.get('effectiveFrom')?.touched">Date requise</div>
              </div>

              <div class="form-group">
                <label for="effectiveTo">Effectif au</label>
                <input id="effectiveTo" type="date" formControlName="effectiveTo" class="form-control">
                <small class="form-help">Laisser vide pour "indéfini"</small>
              </div>
            </div>

            <div class="form-group">
              <label for="isActive">
                <input id="isActive" type="checkbox" formControlName="isActive" class="form-checkbox">
                <span>Actif</span>
              </label>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-secondary" (click)="closeForm()">Annuler</button>
              <button type="submit" class="btn-primary" [disabled]="!form.valid || saving">
                {{ saving ? 'Sauvegarde...' : 'Enregistrer' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <style>
      .page-container { max-width: 1200px; margin: 0 auto; padding: 24px; }
      .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
      .page-title { margin: 0; font-size: 28px; font-weight: 700; }
      .page-subtitle { margin: 4px 0 0; font-size: 14px; color: #6b7280; }
      .btn-primary { background: #3b82f6; color: white; border: none; padding: 10px 16px; border-radius: 6px; font-weight: 500; cursor: pointer; }
      .btn-primary:hover { background: #2563eb; }
      
      .filter-bar { display: flex; gap: 12px; margin-bottom: 24px; align-items: center; }
      .filter-bar label { font-weight: 600; font-size: 14px; }
      .form-input-sm { padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; }
      .tag-info { display: inline-block; background: #e0e7ff; color: #4f46e5; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }

      .card { background: white; border-radius: 8px; border: 1px solid #e5e7eb; }
      .table-wrapper { overflow-x: auto; }
      .data-table { width: 100%; border-collapse: collapse; font-size: 14px; }
      .data-table thead { background: #f9fafb; border-bottom: 2px solid #e5e7eb; }
      .data-table th { padding: 12px; text-align: left; font-weight: 600; color: #374151; }
      .data-table td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
      .data-table tbody tr:hover { background: #fafafa; }
      
      .code-badge { display: inline-block; background: #f0f9ff; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-family: monospace; font-size: 12px; }
      .rate-pill { display: inline-block; background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 12px; font-weight: 600; }
      .version-badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
      .status-dot { display: inline-flex; align-items: center; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
      .status-dot.active { background: #dcfce7; color: #166534; }
      .status-dot.inactive { background: #fee2e2; color: #991b1b; }

      .loading-cell, .empty-cell { text-align: center; padding: 40px !important; }
      .spinner { display: inline-block; width: 20px; height: 20px; border: 3px solid #e5e7eb; border-radius: 50%; border-top-color: #3b82f6; animation: spin 1s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
      
      .actions-cell { white-space: nowrap; }
      .action-btn { background: none; border: none; cursor: pointer; padding: 6px; color: #6b7280; }
      .action-btn:hover { color: #111827; }
      .btn-delete:hover { color: #dc2626; }

      .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
      .modal-dialog { background: white; border-radius: 8px; max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto; }
      .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid #e5e7eb; }
      .modal-header h2 { margin: 0; font-size: 20px; }
      .btn-close { background: none; border: none; font-size: 28px; cursor: pointer; color: #6b7280; }
      .modal-body { padding: 20px; }
      .modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 20px; border-top: 1px solid #e5e7eb; }
      
      .form-group { margin-bottom: 16px; }
      .form-group label { display: block; margin-bottom: 6px; font-weight: 600; font-size: 14px; }
      .form-group label.required::after { content: ' *'; color: #dc2626; }
      .form-control, .form-input-sm { width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; }
      .form-control:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
      .form-error { color: #dc2626; font-size: 12px; margin-top: 4px; }
      .form-help { display: block; color: #6b7280; font-size: 12px; margin-top: 4px; }
      .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .form-checkbox { margin-right: 6px; }

      .btn-secondary { background: #e5e7eb; color: #111827; border: none; padding: 10px 16px; border-radius: 6px; font-weight: 500; cursor: pointer; }
      .btn-secondary:hover { background: #d1d5db; }
    </style>
  `
})
export class StatutoryRatesComponent implements OnInit, OnDestroy {
  rates: any[] = [];
  form!: FormGroup;
  showForm = false;
  loading = false;
  saving = false;
  editingRate: any | null = null;
  filterDate = new Date().toISOString().split('T')[0];

  private destroy$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private formBuilder: FormBuilder
  ) {
    this.form = this.formBuilder.group({
      code: ['', Validators.required],
      label: ['', Validators.required],
      rate: ['', [Validators.required, Validators.min(0), Validators.max(100)]],
      ceiling: [null],
      effectiveFrom: ['', Validators.required],
      effectiveTo: [null],
      isActive: [true]
    });
  }

  ngOnInit() {
    this.loadRates();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadRates() {
    this.loading = true;
    let params = new HttpParams();
    if (this.filterDate) params = params.set('date', this.filterDate);
    this.http.get<any[]>(`${environment.apiUrl}/payroll/statutory-rates`, { params })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.rates = data;
          this.loading = false;
        },
        error: (err) => {
          console.error('Erreur chargement taux:', err);
          alert('Erreur lors du chargement des taux');
          this.loading = false;
        }
      });
  }

  openForm() {
    this.editingRate = null;
    this.form.reset({ isActive: true });
    this.showForm = true;
  }

  editRate(rate: any) {
    this.editingRate = rate;
    this.form.patchValue({
      code: rate.code,
      label: rate.label,
      rate: rate.rate * 100,
      ceiling: rate.ceiling || null,
      effectiveFrom: rate.effectiveFrom?.split('T')[0],
      effectiveTo: rate.effectiveTo ? rate.effectiveTo.split('T')[0] : null,
      isActive: rate.isActive
    });
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.editingRate = null;
    this.form.reset({ isActive: true });
  }

  saveRate() {
    if (!this.form.valid) return;

    this.saving = true;
    const data = {
      ...this.form.value,
      rate: this.form.value.rate / 100
    };

    const url = this.editingRate
      ? `${environment.apiUrl}/payroll/statutory-rates/${this.editingRate.id}`
      : `${environment.apiUrl}/payroll/statutory-rates`;

    const request = this.editingRate
      ? this.http.put<any>(url, data)
      : this.http.post<any>(url, data);

    request.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        alert(this.editingRate ? 'Taux modifié' : 'Taux créé');
        this.closeForm();
        this.loadRates();
      },
      error: (err) => {
        console.error('Erreur sauvegarde:', err);
        alert('Erreur lors de la sauvegarde');
        this.saving = false;
      }
    });
  }

  deleteRate(rate: any) {
    if (!confirm(`Supprimer le taux "${rate.label}" ?`)) return;

    this.http.delete(`${environment.apiUrl}/payroll/statutory-rates/${rate.id}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          alert('Taux supprimé');
          this.loadRates();
        },
        error: (err) => {
          console.error('Erreur suppression:', err);
          alert('Erreur lors de la suppression');
        }
      });
  }
}
