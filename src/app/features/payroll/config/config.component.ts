import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, finalize, of, debounceTime, distinctUntilChanged, takeUntil, Subject } from 'rxjs';
import { monthlyHoursFromWeekly, hourlyRateFromMonthlySalary } from '../../../core/utils/payroll-hours';

export interface PayrollConfig {
  id: string;
  companyId: string;
  regime: string;
  currency: string;
  weeklyHours: number | null;
  monthlyHours: number | null;
  /** Heures sup. ajoutées au dénominateur du taux horaire : salaire ÷ (monthlyHours + ce champ). */
  overtimeHoursForRate: number | null;
  workingDaysPerMonth: number | null;
  cnssEnabled: boolean;
  amoEnabled: boolean;
  irEnabled: boolean;
  cimrEnabled: boolean;
  damancomEnabled?: boolean;
  defaultCnssDeclaredDays: number | null;
  payslipTemplate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  version?: number;
  isActive?: boolean;
  dateEffet?: string;
  createdById?: string | null;
  company?: {
    id: string;
    name: string;
    status: string;
  };
}

/** Modules de cotisation : source = licence entreprise (affichage + payload sauvegarde). */
export interface LicenseModulesSnapshot {
  cnssEnabled: boolean;
  amoEnabled: boolean;
  irEnabled: boolean;
  cimrEnabled: boolean;
  damancomEnabled: boolean;
}

interface LicenseApiResponse {
  id?: string;
  companyId?: string;
  planCode?: string;
  status?: string;
  payrollEnabled?: boolean;
  rhEnabled?: boolean;
  cnssEnabled?: boolean;
  taxEnabled?: boolean;
  cimrEnabled?: boolean;
  damancomEnabled?: boolean;
  availableRegimes?: string[];
  startsAt?: string;
  endsAt?: string | null;
}

/** Ligne affichée = même logique que l’écran Licences (modules activés). */
export interface LicenseModuleRow {
  code: string;
  label: string;
  description: string;
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
export class PayrollConfigComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private apiUrl = 'http://localhost:3000/payroll-config';
  private companiesUrl = 'http://localhost:3000/companies';
  private licensesUrl = 'http://localhost:3000/licenses';

  configurations: PayrollConfig[] = [];
  filteredConfigs: PayrollConfig[] = [];
  companies: Company[] = [];
  searchTerm = '';
  loading = false;
  saving = false;
  showModal = false;
  showDetailsModal = false;
  detailsConfig: PayrollConfig | null = null;
  editingConfig: PayrollConfig | null = null;
  errorMessage = '';
  successMessage = '';
  dataLoaded = false; // Nouveau flag pour suivre l'état du chargement

  // Variable pour suivre si l'API a répondu
  apiResponded = false;

  /** Modules CNSS / AMO / IR / CIMR / Damancom — lus depuis la licence (non modifiables ici). */
  licenseModules: LicenseModulesSnapshot | null = null;
  /** Réponse licence brute (pour libellés / résumé). */
  licenseApiSnapshot: LicenseApiResponse | null = null;
  licenseLoading = false;
  licenseLoadError = '';

  /** Licence par entreprise — pour colonne Modules du tableau (super admin : GET /licenses). */
  private readonly licenseSnapshotByCompanyId = new Map<string, LicenseApiResponse>();

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

  readonly regimeOptions = [
    { value: 'MOROCCO_STANDARD',    label: 'Maroc — Standard' },
    { value: 'MAROC_TRANSPORT',     label: 'Maroc — Transport' },
    { value: 'MOROCCO_OFFSHORE',    label: 'Maroc — Offshore' },
    { value: 'MOROCCO_AGRICULTURAL', label: 'Maroc — Agricole' },
  ];
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

  constructor(
    private fb: FormBuilder, 
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {
    this.configForm = this.fb.group({
      companyId: [''],
      regime: ['MOROCCO_STANDARD', Validators.required],
      currency: ['MAD', Validators.required],
      weeklyHours: [44, [Validators.required, Validators.min(0), Validators.max(168)]],
      monthlyHours: [monthlyHoursFromWeekly(44), [Validators.required, Validators.min(0)]],
      overtimeHoursForRate: [null as number | null, [Validators.min(0)]],
      workingDaysPerMonth: [26, [Validators.required, Validators.min(1), Validators.max(31)]],
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

    this.configForm
      .get('companyId')
      ?.valueChanges.pipe(debounceTime(150), distinctUntilChanged())
      .subscribe((companyId) => {
        if (this.showModal && !this.editingConfig && companyId) {
          this.loadLicenseModules(companyId);
        }
      });

    this.configForm
      .get('weeklyHours')
      ?.valueChanges.pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((w) => {
        const next = monthlyHoursFromWeekly(Number(w));
        this.configForm.patchValue({ monthlyHours: next }, { emitEvent: false });
      });

    // Initialisation sécurisée avec NgZone
    this.initializeData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Aperçu formule taux horaire : salaire ÷ heures travaillées par mois. */
  get hourlyRateExampleLine(): string {
    const cur = (this.configForm.get('currency')?.value as string) || 'MAD';
    const salary = 5000;
    const monthlyH: number = Number(this.configForm.get('monthlyHours')?.value) || 190.67;
    const overtimeH: number = Number(this.configForm.get('overtimeHoursForRate')?.value) || 0;
    const denominator = monthlyH + overtimeH;
    const r = hourlyRateFromMonthlySalary(salary, monthlyH, overtimeH);
    if (!r) return '';
    const denominatorLabel = overtimeH > 0
      ? `${monthlyH} + ${overtimeH} = ${denominator.toFixed(2)}`
      : `${denominator.toFixed(2)}`;
    return `Ex. : salaire ${salary} ${cur} ÷ ${denominatorLabel} h = ${r} ${cur}/h`;
  }

  private getUserCompanyId(): string {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return '';
      const user = JSON.parse(userStr);
      return user?.companyId || '';
    } catch {
      return '';
    }
  }

  /**
   * Heures/mois pour le formulaire ou l’affichage : 44×52÷12 (≈190,67) par défaut.
   * Ancienne valeur arrondie 191,33 pour 44 h/semaine est remplacée par le calcul légal.
   */
  private displayMonthlyHours(
    weekly: number | null | undefined,
    stored: number | null | undefined
  ): number {
    const w = Number(weekly);
    const week = Number.isFinite(w) && w > 0 ? w : 44;
    const auto = monthlyHoursFromWeekly(week);
    if (stored === null || stored === undefined) return auto;
    const s = Number(stored);
    if (!Number.isFinite(s)) return auto;
    const legacy191 = Math.abs(week - 44) < 0.01 && Math.abs(s - 191.33) < 0.05;
    if (legacy191) return auto;
    return s;
  }

  private normalizePayrollConfigRow(c: PayrollConfig): PayrollConfig {
    return {
      ...c,
      monthlyHours: this.displayMonthlyHours(c.weeklyHours, c.monthlyHours),
    };
  }

  /** Entreprise concernée par le formulaire modal (création ou édition). */
  get companyIdForModal(): string {
    if (this.editingConfig) return this.editingConfig.companyId;
    if (this.isSuperAdmin) return this.configForm.get('companyId')?.value || '';
    return this.getUserCompanyId();
  }

  /** Sauvegarde possible seulement si la licence a été chargée (modules imposés par la licence). */
  get canSavePayrollConfig(): boolean {
    if (this.licenseLoading || this.licenseLoadError) return false;
    const cid = this.companyIdForModal;
    if (!cid) return false;
    return !!this.licenseModules;
  }

  /**
   * Modules activés sur la licence — même ordre et libellés que l’écran « Licences »
   * (Paie, RH, CNSS, Taxes, Damancom). AMO et CIMR en complément si prévus par la licence.
   */
  get licenseModulesFromLicense(): LicenseModuleRow[] {
    const lic = this.licenseApiSnapshot;
    if (!lic) return [];

    const rows: LicenseModuleRow[] = [];

    if (lic.payrollEnabled === true) {
      rows.push({
        code: 'PAYROLL',
        label: 'Module Paie',
        description: 'Gestion et calcul de la paie',
      });
    }
    if (lic.rhEnabled === true) {
      rows.push({
        code: 'RH',
        label: 'Module RH',
        description: 'Ressources humaines',
      });
    }
    if (lic.cnssEnabled === true) {
      rows.push({
        code: 'CNSS',
        label: 'Module CNSS',
        description: 'Caisse Nationale de Sécurité Sociale',
      });
      rows.push({
        code: 'AMO',
        label: 'AMO',
        description: 'Assurance Maladie Obligatoire (associée au module CNSS sur la licence)',
      });
    }
    if (lic.taxEnabled === true) {
      rows.push({
        code: 'TAXES',
        label: 'Module Taxes',
        description: 'Impôt sur le revenu et éléments fiscaux',
      });
    }
    if (lic.damancomEnabled === true) {
      rows.push({
        code: 'DAMANCOM',
        label: 'Module Damancom',
        description: 'Déclarations sociales Damancom',
      });
    }
    if (lic.cimrEnabled === true) {
      rows.push({
        code: 'CIMR',
        label: 'Module CIMR',
        description: 'Caisse Interprofessionnelle Marocaine de Retraite',
      });
    }

    return rows;
  }

  get licenseSummaryLine(): string {
    const lic = this.licenseApiSnapshot;
    if (!lic?.planCode && lic?.status == null) return '';
    const parts = [lic.planCode, lic.status].filter(Boolean);
    return parts.length ? `Licence : ${parts.join(' · ')}` : '';
  }

  private mapLicenseToModules(lic: LicenseApiResponse): LicenseModulesSnapshot {
    const cnss = !!lic.cnssEnabled;
    return {
      cnssEnabled: cnss,
      amoEnabled: cnss,
      irEnabled: !!lic.taxEnabled,
      cimrEnabled: !!lic.cimrEnabled,
      damancomEnabled: !!lic.damancomEnabled,
    };
  }

  /**
   * Pastilles « Modules » : uniquement ceux présents sur la licence de l’entreprise.
   * Couleur « on » = activé dans la config paie (ou toujours pour Paie/RH sous licence).
   */
  tableModulePills(config: PayrollConfig): { label: string; on: boolean; licensedOnly: boolean }[] {
    const lic = this.licenseSnapshotByCompanyId.get(config.companyId);
    if (!lic) return [];
    const pills: { label: string; on: boolean; licensedOnly: boolean }[] = [];
    if (lic.payrollEnabled === true) {
      pills.push({ label: 'Paie', on: true, licensedOnly: true });
    }
    if (lic.rhEnabled === true) {
      pills.push({ label: 'RH', on: true, licensedOnly: true });
    }
    if (lic.cnssEnabled === true) {
      pills.push({ label: 'CNSS', on: !!config.cnssEnabled, licensedOnly: false });
      pills.push({ label: 'AMO', on: !!config.amoEnabled, licensedOnly: false });
    }
    if (lic.taxEnabled === true) {
      pills.push({ label: 'IR', on: !!config.irEnabled, licensedOnly: false });
    }
    if (lic.damancomEnabled === true) {
      pills.push({ label: 'Damancom', on: !!config.damancomEnabled, licensedOnly: false });
    }
    if (lic.cimrEnabled === true) {
      pills.push({ label: 'CIMR', on: !!config.cimrEnabled, licensedOnly: false });
    }
    return pills;
  }

  licenseForDetails(): LicenseApiResponse | null {
    const cid = this.detailsConfig?.companyId;
    if (!cid) return null;
    return this.licenseSnapshotByCompanyId.get(cid) ?? null;
  }

  formatDetailDate(value: string | undefined | null): string {
    if (value == null || value === '') return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString('fr-FR');
  }

  openDetails(config: PayrollConfig): void {
    this.detailsConfig = config;
    this.showDetailsModal = true;
    if (config.companyId && !this.licenseSnapshotByCompanyId.has(config.companyId)) {
      this.http
        .get<LicenseApiResponse>(`${this.licensesUrl}/company/${config.companyId}`, { headers: this.authHeaders })
        .pipe(catchError(() => of(null)))
        .subscribe((lic) => {
          this.ngZone.run(() => {
            if (lic && config.companyId) this.licenseSnapshotByCompanyId.set(config.companyId, lic);
            this.cdr.detectChanges();
          });
        });
    }
  }

  closeDetails(): void {
    this.showDetailsModal = false;
    this.detailsConfig = null;
    this.cdr.detectChanges();
  }

  closeDetailsOnBackdrop(ev: MouseEvent): void {
    if ((ev.target as HTMLElement).classList.contains('modal-backdrop--details')) {
      this.closeDetails();
    }
  }

  private hydrateLicenseMapForConfigs(configs: PayrollConfig[]): void {
    this.licenseSnapshotByCompanyId.clear();
    if (configs.length === 0) return;

    if (this.isSuperAdmin) {
      this.http
        .get<LicenseApiResponse[]>(this.licensesUrl, { headers: this.authHeaders })
        .pipe(catchError(() => of([] as LicenseApiResponse[])))
        .subscribe((list) => {
          this.ngZone.run(() => {
            for (const lic of list || []) {
              if (lic.companyId) this.licenseSnapshotByCompanyId.set(lic.companyId, lic);
            }
            this.cdr.detectChanges();
          });
        });
      return;
    }

    const cid = this.getUserCompanyId();
    if (!cid) return;
    this.http
      .get<LicenseApiResponse>(`${this.licensesUrl}/company/${cid}`, { headers: this.authHeaders })
      .pipe(catchError(() => of(null)))
      .subscribe((lic) => {
        this.ngZone.run(() => {
          if (lic) this.licenseSnapshotByCompanyId.set(cid, lic);
          this.cdr.detectChanges();
        });
      });
  }

  loadLicenseModules(companyId: string) {
    if (!companyId) {
      this.licenseModules = null;
      this.licenseApiSnapshot = null;
      this.licenseLoadError = '';
      return;
    }
    this.licenseLoading = true;
    this.licenseLoadError = '';
    this.licenseModules = null;
    this.licenseApiSnapshot = null;

    this.http
      .get<LicenseApiResponse>(`${this.licensesUrl}/company/${companyId}`, { headers: this.authHeaders })
      .subscribe({
        next: (lic) => {
          this.ngZone.run(() => {
            this.licenseLoading = false;
            this.licenseApiSnapshot = lic;
            this.licenseModules = this.mapLicenseToModules(lic);
            this.licenseLoadError = '';
            this.cdr.detectChanges();
          });
        },
        error: (error: HttpErrorResponse) => {
          this.ngZone.run(() => {
            this.licenseLoading = false;
            this.licenseModules = null;
            this.licenseApiSnapshot = null;
            const msg = error.error?.error;
            this.licenseLoadError =
              typeof msg === 'string'
                ? msg
                : error.message || 'Impossible de charger la licence de cette entreprise.';
            this.cdr.detectChanges();
          });
        },
      });
  }

  private resetLicenseState() {
    this.licenseModules = null;
    this.licenseApiSnapshot = null;
    this.licenseLoading = false;
    this.licenseLoadError = '';
  }

  /**
   * Méthode d'initialisation robuste qui garantit le chargement des données
   */
  private async initializeData(): Promise<void> {
    try {
      // Étape 1: Attendre que le composant soit complètement initialisé
      await this.waitForStableState();
      
      // Étape 2: Charger les données dans la zone Angular
      this.ngZone.run(() => {
        this.loadConfigurations();
        
        if (this.isSuperAdmin) {
          console.log('Loading companies for Super Admin');
          this.loadCompanies();
        }
      });
      
      // Étape 3: Forcer la détection de changement après un court délai
      setTimeout(() => {
        this.cdr.detectChanges();
      }, 50);
      
    } catch (error) {
      console.error('Erreur d\'initialisation:', error);
    }
  }

  /**
   * Attendre que l'état soit stable avant de charger les données
   */
  private waitForStableState(): Promise<void> {
    return new Promise((resolve) => {
      if (this.ngZone.isStable) {
        // Déjà stable, attendre le prochain cycle
        setTimeout(() => resolve(), 0);
      } else {
        // Attendre que la zone soit stable
        const subscription = this.ngZone.onStable.subscribe(() => {
          subscription.unsubscribe();
          setTimeout(() => resolve(), 0);
        });
      }
    });
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
          this.ngZone.run(() => {
            console.log('Companies loaded:', data?.length || 0);
            console.log('Companies data:', data);
            this.companies = data || [];
            this.apiResponded = true;
            this.dataLoaded = true;
            
            // Forcer la détection de changement
            this.cdr.markForCheck();
            this.cdr.detectChanges();
            
            console.log('Companies updated in view');
          });
        },
        error: (err) => {
          this.ngZone.run(() => {
            console.error('Companies subscription error:', err);
            this.companies = [];
            this.apiResponded = true;
            this.dataLoaded = true;
            this.cdr.detectChanges();
          });
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
          this.ngZone.run(() => {
            console.log('=== DATA RECEIVED ===');
            console.log('Raw data type:', typeof data);
            console.log('Is array:', Array.isArray(data));
            console.log('Raw data:', JSON.stringify(data, null, 2));
            
            // Réinitialiser le message d'erreur si on reçoit des données
            this.errorMessage = '';
            
            if (Array.isArray(data) && data.length > 0) {
              this.configurations = data.map((d) => this.normalizePayrollConfigRow(d as PayrollConfig));
              this.dataLoaded = true;
            } else if (data && !Array.isArray(data)) {
              this.configurations = [this.normalizePayrollConfigRow(data as PayrollConfig)];
              this.dataLoaded = true;
            } else if (Array.isArray(data) && data.length === 0) {
              this.configurations = [];
              this.errorMessage = 'Aucune configuration trouvée. Cliquez sur "Nouvelle configuration" pour en créer une.';
              this.dataLoaded = true;
            } else {
              this.configurations = [];
              this.errorMessage = 'Format de données invalide reçu du serveur.';
              this.dataLoaded = true;
            }
            
            // Mettre à jour les configurations filtrées
            this.filteredConfigs = [...this.configurations];

            this.hydrateLicenseMapForConfigs(this.configurations);
            
            // Forcer la mise à jour de la vue
            this.cdr.markForCheck();
            this.cdr.detectChanges();
            
            console.log('Configurations count:', this.configurations.length);
            console.log('First config:', this.configurations[0]);
            console.log('Filtered configs count:', this.filteredConfigs.length);
            console.log('View should be updated now');
          });
        },
        error: (err) => {
          this.ngZone.run(() => {
            console.error('Subscription error:', err);
            this.configurations = [];
            this.filteredConfigs = [];
            this.errorMessage = 'Erreur lors du chargement des données. Vérifiez la console.';
            this.dataLoaded = true;
            this.cdr.detectChanges();
          });
        }
      });
  }

  /**
   * Méthode de rafraîchissement forcé qui vide d'abord les données
   */
  forceRefresh() {
    console.log('Force refresh...');
    
    // Vider les données existantes
    this.configurations = [];
    this.filteredConfigs = [];
    this.companies = [];
    this.dataLoaded = false;
    
    // Forcer la mise à jour de la vue
    this.cdr.detectChanges();
    
    // Recharger après un court délai
    setTimeout(() => {
      this.loadConfigurations();
      if (this.isSuperAdmin) {
        this.loadCompanies();
      }
    }, 100);
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
    
    // Forcer la mise à jour après la recherche
    this.cdr.detectChanges();
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

  getCompanyStatus(config: PayrollConfig): string {
    if (!config?.company) return 'INACTIVE';
    return config.company.status || 'INACTIVE';
  }

  getCompanyDisplayInfo(config: PayrollConfig): { name: string; status: string; isActive: boolean } {
    const name = this.getCompanyName(config);
    const status = this.getCompanyStatus(config);
    const isActive = status === 'ACTIVE';
    
    return { name, status, isActive };
  }

  formatRegime(regime: string): string {
    const map: Record<string, string> = {
      MOROCCO_STANDARD: 'Maroc Standard',
      MAROC_TRANSPORT: 'Maroc Transport',
      MOROCCO_OFFSHORE: 'Maroc Offshore',
      MOROCCO_AGRICULTURAL: 'Maroc Agricole',
    };
    return map[regime] || regime?.replace(/_/g, ' ') || '—';
  }

  /** Conservée pour compatibilité si le template appelle encore moduleOn(...). */
  moduleOn(lic: LicenseModulesSnapshot, key: keyof LicenseModulesSnapshot): boolean {
    return !!lic?.[key];
  }

  getModuleClass(enabled: boolean): string {
    return enabled ? 'pc-module on' : 'pc-module';
  }

  openAddModal() {
    console.log('Opening add modal - isSuperAdmin:', this.isSuperAdmin);
    this.editingConfig = null;
    this.errorMessage = '';
    this.resetLicenseState();
    this.configForm.reset(
      {
        companyId: '',
        regime: 'MOROCCO_STANDARD',
        currency: 'MAD',
        weeklyHours: 44,
        monthlyHours: monthlyHoursFromWeekly(44),
        overtimeHoursForRate: null,
        workingDaysPerMonth: 26,
        defaultCnssDeclaredDays: 26,
        payslipTemplate: '',
        notes: '',
      },
      { emitEvent: false }
    );
    this.showModal = true;

    // Si Super Admin et entreprises non chargées, les recharger
    if (this.isSuperAdmin && this.companies.length === 0) {
      this.loadCompanies();
    }
  }

  editConfig(config: PayrollConfig) {
    console.log('Editing config:', config?.id);
    if (!config) return;

    this.editingConfig = config;
    this.errorMessage = '';
    this.resetLicenseState();
    const wh = config.weeklyHours ?? 44;
    this.configForm.patchValue(
      {
        companyId: config.companyId,
        regime: config.regime,
        currency: config.currency,
        weeklyHours: wh,
        monthlyHours: this.displayMonthlyHours(config.weeklyHours, config.monthlyHours),
        overtimeHoursForRate:
          config.overtimeHoursForRate !== null && config.overtimeHoursForRate !== undefined
            ? Number(config.overtimeHoursForRate)
            : null,
        workingDaysPerMonth: config.workingDaysPerMonth ?? 26,
        defaultCnssDeclaredDays: config.defaultCnssDeclaredDays ?? 26,
        payslipTemplate: config.payslipTemplate || '',
        notes: config.notes || '',
      },
      { emitEvent: false }
    );
    this.showModal = true;
    this.loadLicenseModules(config.companyId);
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

    const companyIdForSave =
      this.editingConfig?.companyId ??
      (this.isSuperAdmin ? this.configForm.get('companyId')?.value : this.getUserCompanyId());

    if (!this.licenseModules && companyIdForSave) {
      this.loadLicenseModules(companyIdForSave);
      this.errorMessage =
        'Chargement de la licence en cours. Les modules (CNSS, AMO, IR, etc.) proviennent de la licence : patientez puis réessayez.';
      return;
    }

    if (!this.licenseModules) {
      this.errorMessage =
        'Impossible d’enregistrer : licence non disponible. Vérifiez la licence de l’entreprise (menu Licences).';
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    const raw = this.configForm.value;

    let overtimeHoursForRate: number | null = null;
    const otRaw = raw.overtimeHoursForRate;
    if (otRaw !== null && otRaw !== undefined && String(otRaw).trim() !== '') {
      const n = Number(otRaw);
      overtimeHoursForRate = Number.isFinite(n) ? n : null;
    }
    const payload = {
      regime: raw.regime,
      currency: raw.currency,
      weeklyHours: raw.weeklyHours ? Number(raw.weeklyHours) : null,
      monthlyHours: raw.monthlyHours ? Number(raw.monthlyHours) : null,
      overtimeHoursForRate,
      workingDaysPerMonth: raw.workingDaysPerMonth ? Number(raw.workingDaysPerMonth) : null,
      cnssEnabled: this.licenseModules.cnssEnabled,
      amoEnabled: this.licenseModules.amoEnabled,
      irEnabled: this.licenseModules.irEnabled,
      cimrEnabled: this.licenseModules.cimrEnabled,
      damancomEnabled: this.licenseModules.damancomEnabled,
      defaultCnssDeclaredDays: raw.defaultCnssDeclaredDays
        ? parseInt(raw.defaultCnssDeclaredDays, 10)
        : 26,
      dateEffet: raw.dateEffet || new Date().toISOString().slice(0, 10),
      isActive: Boolean(raw.isActive ?? true),
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
        this.ngZone.run(() => {
          console.log('Save success:', response);
          this.saving = false;
          this.successMessage = 'Configuration enregistrée avec succès';
          this.closeModal();
          this.loadConfigurations();
          setTimeout(() => {
            this.successMessage = '';
            this.cdr.detectChanges();
          }, 3000);
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          console.error('Save error:', err);
          this.saving = false;
          this.errorMessage = err.error?.error || err.message || 'Erreur lors de la sauvegarde';
          this.cdr.detectChanges();
        });
      }
    });
  }

  deleteConfig(id: string) {
    if (!id) return;
    if (!confirm('Supprimer cette configuration ?')) return;

    console.log('Deleting config:', id);
    this.http.delete(`${this.apiUrl}/${id}`, { headers: this.authHeaders }).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.successMessage = 'Configuration supprimée avec succès';
          this.loadConfigurations();
          setTimeout(() => {
            this.successMessage = '';
            this.cdr.detectChanges();
          }, 3000);
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          console.error('Delete error:', err);
          this.errorMessage = err.error?.error || 'Erreur lors de la suppression';
          this.cdr.detectChanges();
        });
      }
    });
  }

  refreshData() {
    console.log('Manual refresh...');
    this.forceRefresh();
  }

  testApiConnection() {
    console.log('Testing API connection...');
    const url = this.isSuperAdmin ? `${this.apiUrl}/all` : this.apiUrl;
    this.http.get(url, { headers: this.authHeaders }).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
          console.log('API Response:', data);
          alert('API répond correctement ! Données reçues: ' + JSON.stringify(data).substring(0, 200));
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          console.error('API Error:', err);
          alert('Erreur API: ' + err.message + '\nStatus: ' + err.status);
        });
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
    this.resetLicenseState();
    this.cdr.detectChanges();
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