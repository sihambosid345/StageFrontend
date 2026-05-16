import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';

interface SalaryTypeConfig {
  id: string;
  employeeId: string;
  contractId: string;
  salaryCalculationType: 'MONTHLY' | 'DAILY' | 'HOURLY' | 'MISSION';
  baseSalary?: number;
  dailyRate?: number;
  hourlyRate?: number;
  missionRate?: number;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  employeeName?: string;
  contractCode?: string;
}

@Component({
  selector: 'app-salary-types',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Types de Salaire</h1>
          <p class="page-subtitle">Configuration des modes de calcul du salaire — MONTHLY | DAILY | HOURLY | MISSION</p>
        </div>
        <button class="btn-primary" (click)="openForm()">+ Nouveau type</button>
      </div>

      <!-- Filtre statut -->
      <div class="filter-bar">
        <label>Statut</label>
        <select [(ngModel)]="filterActive" (change)="loadConfigs()" class="form-input-sm">
          <option [value]="null">Tous</option>
          <option [value]="true">Actifs</option>
          <option [value]="false">Inactifs</option>
        </select>
        <span class="tag-info">
          {{ filteredConfigs.length }} configuration(s)
        </span>
      </div>

      <!-- Tableau configurations -->
      <div class="card">
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>EMPLOYÉ</th>
                <th>CONTRAT</th>
                <th>TYPE DE CALCUL</th>
                <th>SALAIRE/TAUX</th>
                <th>EFFECTIF DU</th>
                <th>EFFECTIF AU</th>
                <th>STATUT</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="loading">
                <td colspan="8" class="loading-cell"><div class="spinner"></div> Chargement...</td>
              </tr>
              <tr *ngIf="!loading && filteredConfigs.length === 0">
                <td colspan="8" class="empty-cell">
                  <div class="empty-state">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <p>Aucune configuration de salaire</p>
                    <button class="btn-primary" (click)="openForm()">Créer la première configuration</button>
                  </div>
                </td>
              </tr>
              <tr *ngFor="let config of filteredConfigs" class="table-row">
                <td>{{ config.employeeName }}</td>
                <td><span class="code-badge">{{ config.contractCode }}</span></td>
                <td>
                  <span class="type-badge" [class]="'type-' + config.salaryCalculationType?.toLowerCase()">
                    {{ config.salaryCalculationType }}
                  </span>
                </td>
                <td class="amount">
                  {{ getDisplayAmount(config) }}
                </td>
                <td>{{ config.effectiveFrom | date:'dd/MM/yyyy' }}</td>
                <td>{{ config.effectiveTo ? (config.effectiveTo | date:'dd/MM/yyyy') : '∞' }}</td>
                <td>
                  <span class="status-dot" [class.active]="config.isActive" [class.inactive]="!config.isActive">
                    {{ config.isActive ? 'Actif' : 'Inactif' }}
                  </span>
                </td>
                <td class="actions-cell">
                  <button class="action-btn btn-edit" (click)="editConfig(config)" title="Modifier">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button class="action-btn btn-delete" (click)="deleteConfig(config)" title="Supprimer">
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
      <div class="modal-overlay" *ngIf="showForm" (click)="closeForm()">
        <div class="modal-dialog" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ editingConfig?.id ? 'Modifier configuration' : 'Nouvelle configuration' }}</h2>
            <button class="btn-close" (click)="closeForm()">×</button>
          </div>

          <form [formGroup]="form" (ngSubmit)="saveConfig()" class="modal-body">
            <div class="form-group">
              <label for="employeeId" class="required">Employé</label>
              <select id="employeeId" formControlName="employeeId" class="form-control" [disabled]="!!editingConfig?.id">
                <option value="">-- Sélectionner --</option>
                <option *ngFor="let emp of employees" [value]="emp.id">{{ emp.firstName }} {{ emp.lastName }}</option>
              </select>
              <div class="form-error" *ngIf="form.get('employeeId')?.invalid && form.get('employeeId')?.touched">Employé requis</div>
            </div>

            <div class="form-group">
              <label for="salaryCalculationType" class="required">Type de Calcul</label>
              <select id="salaryCalculationType" formControlName="salaryCalculationType" (change)="onTypeChange()" class="form-control">
                <option value="">-- Sélectionner --</option>
                <option value="MONTHLY">Mensuel — Salaire mensuel fixe</option>
                <option value="DAILY">Journalier — Jours × Taux journalier</option>
                <option value="HOURLY">Horaire — Heures × Taux horaire</option>
                <option value="MISSION">Mission — Missions × Tarif mission</option>
              </select>
              <div class="form-error" *ngIf="form.get('salaryCalculationType')?.invalid && form.get('salaryCalculationType')?.touched">Type requis</div>
            </div>

            <!-- Champs spécifiques par type -->
            <div class="form-group" *ngIf="form.get('salaryCalculationType')?.value === 'MONTHLY'">
              <label for="baseSalary" class="required">Salaire Mensuel (MAD)</label>
              <input id="baseSalary" type="number" formControlName="baseSalary" class="form-control" placeholder="10000" min="0" step="100">
              <div class="form-error" *ngIf="form.get('baseSalary')?.invalid && form.get('baseSalary')?.touched">Montant requis</div>
            </div>

            <div class="form-group" *ngIf="form.get('salaryCalculationType')?.value === 'DAILY'">
              <label for="dailyRate" class="required">Taux Journalier (MAD/jour)</label>
              <input id="dailyRate" type="number" formControlName="dailyRate" class="form-control" placeholder="400" min="0" step="10">
              <small class="form-help">Basé sur 26 jours travaillés/mois</small>
              <div class="form-error" *ngIf="form.get('dailyRate')?.invalid && form.get('dailyRate')?.touched">Taux requis</div>
            </div>

            <div class="form-group" *ngIf="form.get('salaryCalculationType')?.value === 'HOURLY'">
              <label for="hourlyRate" class="required">Taux Horaire (MAD/heure)</label>
              <input id="hourlyRate" type="number" formControlName="hourlyRate" class="form-control" placeholder="50" min="0" step="1">
              <small class="form-help">Basé sur 190.67 heures/mois</small>
              <div class="form-error" *ngIf="form.get('hourlyRate')?.invalid && form.get('hourlyRate')?.touched">Taux requis</div>
            </div>

            <div class="form-group" *ngIf="form.get('salaryCalculationType')?.value === 'MISSION'">
              <label for="missionRate" class="required">Tarif Mission (MAD/mission)</label>
              <input id="missionRate" type="number" formControlName="missionRate" class="form-control" placeholder="1500" min="0" step="100">
              <small class="form-help">Les missions sont saisies comme éléments variables</small>
              <div class="form-error" *ngIf="form.get('missionRate')?.invalid && form.get('missionRate')?.touched">Tarif requis</div>
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
      .type-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-weight: 600; font-size: 12px; }
      .type-monthly { background: #dbeafe; color: #1e40af; }
      .type-daily { background: #dcfce7; color: #166534; }
      .type-hourly { background: #fcd34d; color: #92400e; }
      .type-mission { background: #f0abfc; color: #7e22ce; }

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
export class SalaryTypesComponent implements OnInit, OnDestroy {
  configs: SalaryTypeConfig[] = [];
  form!: FormGroup;
  showForm = false;
  loading = false;
  saving = false;
  editingConfig: SalaryTypeConfig | null = null;
  filterActive: boolean | null = true;
  employees: any[] = [];

  get filteredConfigs(): SalaryTypeConfig[] {
    return this.filterActive === null 
      ? this.configs 
      : this.configs.filter(c => c.isActive === this.filterActive);
  }

  private destroy$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private formBuilder: FormBuilder
  ) {
    this.form = this.formBuilder.group({
      employeeId: ['', Validators.required],
      salaryCalculationType: ['', Validators.required],
      baseSalary: [null],
      dailyRate: [null],
      hourlyRate: [null],
      missionRate: [null],
      effectiveFrom: ['', Validators.required],
      effectiveTo: [null],
      isActive: [true]
    });
  }

  ngOnInit() {
    this.loadConfigs();
    this.loadEmployees();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadConfigs() {
    this.loading = true;
    this.http.get<SalaryTypeConfig[]>(`http://localhost:3000/payroll/salary-types`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.configs = data;
          this.loading = false;
        },
        error: (err) => {
          console.error('Erreur chargement:', err);
          alert('Erreur lors du chargement des configurations');
          this.loading = false;
        }
      });
  }

  loadEmployees() {
    this.http.get<any[]>(`http://localhost:3000/employees`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.employees = data;
        },
        error: (err) => {
          console.error('Erreur employés:', err);
        }
      });
  }

  openForm() {
    this.editingConfig = null;
    this.form.reset({ isActive: true });
    this.showForm = true;
  }

  editConfig(config: SalaryTypeConfig) {
    this.editingConfig = config;
    this.form.patchValue({
      employeeId: config.employeeId,
      salaryCalculationType: config.salaryCalculationType,
      baseSalary: config.baseSalary || null,
      dailyRate: config.dailyRate || null,
      hourlyRate: config.hourlyRate || null,
      missionRate: config.missionRate || null,
      effectiveFrom: config.effectiveFrom?.split('T')[0],
      effectiveTo: config.effectiveTo ? config.effectiveTo.split('T')[0] : null,
      isActive: config.isActive
    });
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.editingConfig = null;
    this.form.reset({ isActive: true });
  }

  onTypeChange() {
    // Réinitialiser les champs spécifiques
    const type = this.form.get('salaryCalculationType')?.value;
    this.form.patchValue({
      baseSalary: null,
      dailyRate: null,
      hourlyRate: null,
      missionRate: null
    });

    // Valider le champ actif
    const fieldName = this.getFieldNameForType(type);
    if (fieldName) {
      this.form.get(fieldName)?.setValidators(Validators.required);
      this.form.get(fieldName)?.updateValueAndValidity();
    }
  }

  getFieldNameForType(type: string): string {
    const map: { [key: string]: string } = {
      'MONTHLY': 'baseSalary',
      'DAILY': 'dailyRate',
      'HOURLY': 'hourlyRate',
      'MISSION': 'missionRate'
    };
    return map[type] || '';
  }

  getDisplayAmount(config: SalaryTypeConfig): string {
    const amount = config.baseSalary || config.dailyRate || config.hourlyRate || config.missionRate || 0;
    const unit = this.getUnitForType(config.salaryCalculationType);
    return `${amount.toFixed(2)} MAD${unit}`;
  }

  getUnitForType(type: string): string {
    const map: { [key: string]: string } = {
      'MONTHLY': '',
      'DAILY': '/jour',
      'HOURLY': '/h',
      'MISSION': '/mission'
    };
    return map[type] || '';
  }

  saveConfig() {
    if (!this.form.valid) return;

    this.saving = true;
    const data = this.form.value;

    const request = this.editingConfig
      ? this.http.put(`http://localhost:3000/payroll/salary-types/${this.editingConfig.id}`, data)
      : this.http.post(`http://localhost:3000/payroll/salary-types`, data);

    request.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        alert(this.editingConfig ? 'Configuration modifiée' : 'Configuration créée');
        this.closeForm();
        this.loadConfigs();
      },
      error: (err) => {
        console.error('Erreur sauvegarde:', err);
        alert('Erreur lors de la sauvegarde');
        this.saving = false;
      }
    });
  }

  deleteConfig(config: SalaryTypeConfig) {
    if (!confirm(`Supprimer la configuration de ${config.employeeName} ?`)) return;

    this.http.delete(`http://localhost:3000/payroll/salary-types/${config.id}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          alert('Configuration supprimée');
          this.loadConfigs();
        },
        error: (err) => {
          console.error('Erreur suppression:', err);
          alert('Erreur lors de la suppression');
        }
      });
  }
}
