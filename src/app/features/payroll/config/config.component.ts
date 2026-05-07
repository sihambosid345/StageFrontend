import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, finalize, of } from 'rxjs';

export interface PayrollConfig {
  id: string;
  companyId: string;
  regime: 'MOROCCO_STANDARD';
  currency: string;
  weeklyHours: number | null;
  monthlyHours: number | null;
  workingDaysPerMonth: number | null;
  cnssEnabled: boolean;
  amoEnabled: boolean;
  irEnabled: boolean;
  cimrEnabled: boolean;
  defaultCnssDeclaredDays: number | null;
  payslipTemplate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  company?: {
    id: string;
    name: string;
    status: string;
  };
}

export interface Company {
  id: string;
  name: string;
  status: string;
}

@Component({
  selector: 'app-payroll-config',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './config.component.html',
  styleUrls: ['./config.component.scss']
})
export class PayrollConfigComponent implements OnInit {
  private apiUrl = 'http://localhost:3000/payroll-config';
  private companiesUrl = 'http://localhost:3000/companies';

  configurations: PayrollConfig[] = [];
  filteredConfigs: PayrollConfig[] = [];
  companies: Company[] = [];
  searchTerm = '';
  loading = false;
  saving = false;
  showModal = false;
  editingConfig: PayrollConfig | null = null;
  errorMessage = '';
  successMessage = '';

  // Variable pour suivre si l'API a répondu
  apiResponded = false;

  get isSuperAdmin(): boolean {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return false;
      const user = JSON.parse(userStr);
      return user?.isSuperAdmin === true || 
             user?.role === 'SUPER_ADMIN' ||
             user?.role === 'super_admin';
    } catch (error) {
      console.error('Error checking super admin:', error);
      return false;
    }
  }

  private get authHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  configForm: FormGroup;

  readonly regimeOptions = [{ value: 'MOROCCO_STANDARD', label: 'Maroc — Standard' }];
  readonly currencyOptions = [
    { value: 'MAD', label: 'MAD — Dirham Marocain' },
    { value: 'EUR', label: 'EUR — Euro' },
    { value: 'USD', label: 'USD — Dollar US' },
    { value: 'GBP', label: 'GBP — Livre Sterling' },
  ];

  readonly payslipTemplateOptions = [
    { value: '', label: 'Standard (défaut)' },
    { value: 'DETAILED', label: 'Détaillé' },
    { value: 'SIMPLIFIED', label: 'Simplifié' },
  ];

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.configForm = this.fb.group({
      companyId: [''],
      regime: ['MOROCCO_STANDARD', Validators.required],
      currency: ['MAD', Validators.required],
      weeklyHours: [44, [Validators.required, Validators.min(0), Validators.max(168)]],
      monthlyHours: [191.33, [Validators.required, Validators.min(0)]],
      workingDaysPerMonth: [26, [Validators.required, Validators.min(1), Validators.max(31)]],
      cnssEnabled: [true],
      amoEnabled: [true],
      irEnabled: [true],
      cimrEnabled: [false],
      defaultCnssDeclaredDays: [26, [Validators.required, Validators.min(1), Validators.max(31)]],
      payslipTemplate: [''],
      notes: [''],
    });
  }

  ngOnInit() {
    console.log('=== INIT PAYROLL CONFIG ===');
    console.log('isSuperAdmin:', this.isSuperAdmin);
    console.log('Token exists:', !!localStorage.getItem('token'));
    console.log('API URL:', this.apiUrl);
    
    // Charger les configurations immédiatement
    this.loadConfigurations();
    
    if (this.isSuperAdmin) {
      console.log('Loading companies for Super Admin');
      this.loadCompanies();
    }
  }

  loadCompanies() {
    console.log('Loading companies from:', this.companiesUrl);
    console.log('Headers:', this.authHeaders);
    
    this.http.get<Company[]>(this.companiesUrl, { headers: this.authHeaders })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Error loading companies:', error);
          this.errorMessage = `Erreur chargement entreprises: ${error.status} - ${error.message}`;
          return of([]);
        })
      )
      .subscribe({
        next: (data) => {
          console.log('Companies loaded:', data?.length || 0);
          console.log('Companies data:', data);
          this.companies = data || [];
          this.apiResponded = true;
        },
        error: (err) => {
          console.error('Companies subscription error:', err);
          this.companies = [];
          this.apiResponded = true;
        }
      });
  }

  loadConfigurations() {
    this.loading = true;
    this.errorMessage = '';

    let url = this.apiUrl;
    if (this.isSuperAdmin) {
      url = `${this.apiUrl}/all`;
    }

    console.log('=== LOADING CONFIGURATIONS ===');
    console.log('URL:', url);
    console.log('isSuperAdmin:', this.isSuperAdmin);
    console.log('Headers:', this.authHeaders);
    
    this.http.get<PayrollConfig[]>(url, { headers: this.authHeaders })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('API Error:', error);
          let message = '';
          if (error.status === 0) {
            message = '❌ Impossible de se connecter au serveur. Vérifiez que le backend est démarré sur le port 3000.';
          } else if (error.status === 401) {
            message = '❌ Non authentifié. Veuillez vous reconnecter.';
          } else if (error.status === 403) {
            message = '❌ Accès non autorisé. Vous n\'avez pas les permissions nécessaires.';
          } else if (error.status === 404) {
            message = '❌ API non trouvée. Vérifiez que le endpoint est correct.';
          } else {
            message = `❌ Erreur ${error.status}: ${error.message}`;
          }
          this.errorMessage = message;
          return of([]);
        }),
        finalize(() => {
          this.loading = false;
          console.log('Loading finished, loading =', this.loading);
        })
      )
      .subscribe({
        next: (data) => {
          console.log('=== DATA RECEIVED ===');
          console.log('Raw data type:', typeof data);
          console.log('Is array:', Array.isArray(data));
          console.log('Raw data:', JSON.stringify(data, null, 2));
          
          if (Array.isArray(data) && data.length > 0) {
            this.configurations = data;
          } else if (data && !Array.isArray(data)) {
            this.configurations = [data as PayrollConfig];
          } else if (Array.isArray(data) && data.length === 0) {
            this.configurations = [];
            this.errorMessage = 'Aucune configuration trouvée. Cliquez sur "Nouvelle configuration" pour en créer une.';
          } else {
            this.configurations = [];
            this.errorMessage = 'Format de données invalide reçu du serveur.';
          }
          
          this.filteredConfigs = [...this.configurations];
          console.log('Configurations count:', this.configurations.length);
          console.log('First config:', this.configurations[0]);
          console.log('Filtered configs count:', this.filteredConfigs.length);
        },
        error: (err) => {
          console.error('Subscription error:', err);
          this.configurations = [];
          this.filteredConfigs = [];
          this.errorMessage = 'Erreur lors du chargement des données. Vérifiez la console.';
        }
      });
  }

  applySearch() {
    if (!this.searchTerm?.trim()) {
      this.filteredConfigs = [...this.configurations];
      return;
    }
    const term = this.searchTerm.toLowerCase();
    this.filteredConfigs = this.configurations.filter(c =>
      c.company?.name?.toLowerCase().includes(term) ||
      c.regime?.toLowerCase().includes(term) ||
      c.currency?.toLowerCase().includes(term)
    );
    console.log('Search results:', this.filteredConfigs.length);
  }

  getActiveCount(): number {
    return this.configurations?.filter(c => c.cnssEnabled || c.amoEnabled || c.irEnabled).length || 0;
  }

  getTotalConfigs(): number {
    return this.configurations?.length || 0;
  }

  getCompaniesCount(): number {
    return this.companies?.length || 0;
  }

  getCompanyName(config: PayrollConfig): string {
    if (!config) return 'N/A';
    return config.company?.name || config.companyId?.substring(0, 8) || 'N/A';
  }

  formatRegime(regime: string): string {
    const map: Record<string, string> = { MOROCCO_STANDARD: 'Maroc Standard' };
    return map[regime] || regime?.replace(/_/g, ' ') || '—';
  }

  getModuleClass(enabled: boolean): string {
    return enabled ? 'pc-module on' : 'pc-module';
  }

  openAddModal() {
    console.log('Opening add modal - isSuperAdmin:', this.isSuperAdmin);
    this.editingConfig = null;
    this.errorMessage = '';
    this.configForm.reset({
      companyId: '',
      regime: 'MOROCCO_STANDARD',
      currency: 'MAD',
      weeklyHours: 44,
      monthlyHours: 191.33,
      workingDaysPerMonth: 26,
      cnssEnabled: true,
      amoEnabled: true,
      irEnabled: true,
      cimrEnabled: false,
      defaultCnssDeclaredDays: 26,
      payslipTemplate: '',
      notes: '',
    });
    this.showModal = true;
  }

  editConfig(config: PayrollConfig) {
    console.log('Editing config:', config?.id);
    if (!config) return;
    
    this.editingConfig = config;
    this.errorMessage = '';
    this.configForm.patchValue({
      companyId: config.companyId,
      regime: config.regime,
      currency: config.currency,
      weeklyHours: config.weeklyHours ?? 44,
      monthlyHours: config.monthlyHours ?? 191.33,
      workingDaysPerMonth: config.workingDaysPerMonth ?? 26,
      cnssEnabled: config.cnssEnabled ?? true,
      amoEnabled: config.amoEnabled ?? true,
      irEnabled: config.irEnabled ?? true,
      cimrEnabled: config.cimrEnabled ?? false,
      defaultCnssDeclaredDays: config.defaultCnssDeclaredDays ?? 26,
      payslipTemplate: config.payslipTemplate || '',
      notes: config.notes || '',
    });
    this.showModal = true;
  }

  saveConfig() {
    // Validation spéciale pour Super Admin
    if (this.isSuperAdmin && !this.editingConfig) {
      const selectedCompanyId = this.configForm.get('companyId')?.value;
      if (!selectedCompanyId || selectedCompanyId === '') {
        this.errorMessage = 'Veuillez sélectionner une entreprise';
        this.configForm.get('companyId')?.markAsTouched();
        return;
      }
    }

    if (this.configForm.invalid) {
      this.configForm.markAllAsTouched();
      console.log('Form invalid:', this.configForm.errors);
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    const raw = this.configForm.value;

    const payload = {
      regime: raw.regime,
      currency: raw.currency,
      weeklyHours: raw.weeklyHours ? Number(raw.weeklyHours) : null,
      monthlyHours: raw.monthlyHours ? Number(raw.monthlyHours) : null,
      workingDaysPerMonth: raw.workingDaysPerMonth ? Number(raw.workingDaysPerMonth) : null,
      cnssEnabled: Boolean(raw.cnssEnabled),
      amoEnabled: Boolean(raw.amoEnabled),
      irEnabled: Boolean(raw.irEnabled),
      cimrEnabled: Boolean(raw.cimrEnabled),
      defaultCnssDeclaredDays: raw.defaultCnssDeclaredDays ? parseInt(raw.defaultCnssDeclaredDays) : 26,
      payslipTemplate: raw.payslipTemplate || null,
      notes: raw.notes || null,
    };

    let obs: Observable<PayrollConfig>;

    if (this.editingConfig) {
      console.log('Updating config:', this.editingConfig.id);
      obs = this.http.put<PayrollConfig>(
        `${this.apiUrl}/${this.editingConfig.id}`,
        payload,
        { headers: this.authHeaders }
      );
    } else if (this.isSuperAdmin) {
      const companyId = raw.companyId;
      if (!companyId) {
        this.errorMessage = 'Veuillez sélectionner une entreprise';
        this.saving = false;
        return;
      }
      console.log('Creating config for company:', companyId);
      obs = this.http.post<PayrollConfig>(
        this.apiUrl,
        { ...payload, companyId: companyId },
        { headers: this.authHeaders }
      );
    } else {
      console.log('Upsert config');
      obs = this.http.post<PayrollConfig>(
        `${this.apiUrl}/upsert`,
        payload,
        { headers: this.authHeaders }
      );
    }

    obs.subscribe({
      next: (response) => {
        console.log('Save success:', response);
        this.saving = false;
        this.successMessage = 'Configuration enregistrée avec succès';
        this.closeModal();
        this.loadConfigurations();
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        console.error('Save error:', err);
        this.saving = false;
        this.errorMessage = err.error?.error || err.message || 'Erreur lors de la sauvegarde';
      }
    });
  }

  deleteConfig(id: string) {
    if (!id) return;
    if (!confirm('Supprimer cette configuration ?')) return;

    console.log('Deleting config:', id);
    this.http.delete(`${this.apiUrl}/${id}`, { headers: this.authHeaders }).subscribe({
      next: () => {
        this.successMessage = 'Configuration supprimée avec succès';
        this.loadConfigurations();
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        console.error('Delete error:', err);
        this.errorMessage = err.error?.error || 'Erreur lors de la suppression';
      }
    });
  }

  refreshData() {
    console.log('Manual refresh...');
    this.loadConfigurations();
    if (this.isSuperAdmin) {
      this.loadCompanies();
    }
  }

  testApiConnection() {
    console.log('Testing API connection...');
    const url = this.isSuperAdmin ? `${this.apiUrl}/all` : this.apiUrl;
    this.http.get(url, { headers: this.authHeaders }).subscribe({
      next: (data) => {
        console.log('API Response:', data);
        alert('API répond correctement ! Données reçues: ' + JSON.stringify(data).substring(0, 200));
      },
      error: (err) => {
        console.error('API Error:', err);
        alert('Erreur API: ' + err.message + '\nStatus: ' + err.status);
      }
    });
  }

  forceSuperAdminMode() {
    const currentUser = localStorage.getItem('user');
    let user = currentUser ? JSON.parse(currentUser) : {};
    user.isSuperAdmin = true;
    user.role = 'SUPER_ADMIN';
    localStorage.setItem('user', JSON.stringify(user));
    console.log('Forced Super Admin mode, reloading...');
    window.location.reload();
  }

  closeModal() {
    this.showModal = false;
    this.editingConfig = null;
    this.errorMessage = '';
  }

  closeModalOnBackdrop(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeModal();
    }
  }

  isFieldInvalid(field: string): boolean {
    const ctrl = this.configForm.get(field);
    return !!(ctrl && ctrl.invalid && ctrl.touched);
  }

  trackById(index: number, item: PayrollConfig): string {
    return item?.id || index.toString();
  }
}