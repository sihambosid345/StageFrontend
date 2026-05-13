import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, finalize, of, debounceTime, distinctUntilChanged, takeUntil, Subject } from 'rxjs';
import { monthlyHoursFromWeekly, hourlyRateFromMonthlySalary } from '../../../core/utils/payroll-hours';
import { AuthService } from '../../../core/services/auth.service';

export interface PayrollConfig {
  id: string;
  companyId: string;
  regime: string;
  currency: string;
  weeklyHours: number | null;
  monthlyHours: number | null;
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
  dataLoaded = false;
  apiResponded = false;

  licenseModules: LicenseModulesSnapshot | null = null;
  licenseApiSnapshot: LicenseApiResponse | null = null;
  licenseLoading = false;
  licenseLoadError = '';

  private readonly licenseSnapshotByCompanyId = new Map<string, LicenseApiResponse>();

  // ✅ Utilise AuthService (clés hrm_token / hrm_user) — pas de lecture directe localStorage
  get isSuperAdmin(): boolean {
    return this.auth.isSuperAdmin();
  }

  private getUserCompanyId(): string {
    return this.auth.currentUser()?.companyId || '';
  }

  getUserCompanyName(): string {
    const user = this.auth.currentUser() as any;
    return user?.companyName || user?.company?.name || 'Mon entreprise';
  }

  configForm: FormGroup;

  readonly regimeOptions = [
    { value: 'MOROCCO_STANDARD',     label: 'Maroc — Standard' },
    { value: 'MAROC_TRANSPORT',      label: 'Maroc — Transport' },
    { value: 'MOROCCO_OFFSHORE',     label: 'Maroc — Offshore' },
    { value: 'MOROCCO_AGRICULTURAL', label: 'Maroc — Agricole' },
  ];
  readonly currencyOptions = [
    { value: 'MAD', label: 'MAD — Dirham Marocain' },
    { value: 'EUR', label: 'EUR — Euro' },
    { value: 'USD', label: 'USD — Dollar US' },
    { value: 'GBP', label: 'GBP — Livre Sterling' },
  ];
  readonly payslipTemplateOptions = [
    { value: '',           label: 'Standard (défaut)' },
    { value: 'DETAILED',   label: 'Détaillé' },
    { value: 'SIMPLIFIED', label: 'Simplifié' },
  ];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private auth: AuthService   // ✅ injection AuthService
  ) {
    this.configForm = this.fb.group({
      companyId:              [''],
      regime:                 ['MOROCCO_STANDARD', Validators.required],
      currency:               ['MAD', Validators.required],
      weeklyHours:            [44, [Validators.required, Validators.min(0), Validators.max(168)]],
      monthlyHours:           [monthlyHoursFromWeekly(44), [Validators.required, Validators.min(0)]],
      overtimeHoursForRate:   [null as number | null, [Validators.min(0)]],
      workingDaysPerMonth:    [26, [Validators.required, Validators.min(1), Validators.max(31)]],
      defaultCnssDeclaredDays:[26, [Validators.required, Validators.min(1), Validators.max(31)]],
      payslipTemplate:        [''],
      notes:                  [''],
    });
  }

  ngOnInit() {
    this.configForm.get('companyId')?.valueChanges
      .pipe(debounceTime(150), distinctUntilChanged())
      .subscribe((companyId) => {
        if (this.showModal && !this.editingConfig && companyId) {
          this.loadLicenseModules(companyId);
        }
      });

    this.configForm.get('weeklyHours')?.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((w) => {
        const next = monthlyHoursFromWeekly(Number(w));
        this.configForm.patchValue({ monthlyHours: next }, { emitEvent: false });
      });

    this.initializeData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Computed helpers ─────────────────────────────────────────────────────

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

  get companyIdForModal(): string {
    if (this.editingConfig) return this.editingConfig.companyId;
    if (this.isSuperAdmin) return this.configForm.get('companyId')?.value || '';
    return this.getUserCompanyId();
  }

  get canSavePayrollConfig(): boolean {
    if (this.licenseLoading || this.licenseLoadError) return false;
    const cid = this.companyIdForModal;
    if (!cid) return false;
    return !!this.licenseModules;
  }

  get licenseModulesFromLicense(): LicenseModuleRow[] {
    const lic = this.licenseApiSnapshot;
    if (!lic) return [];
    const rows: LicenseModuleRow[] = [];
    if (lic.payrollEnabled)  rows.push({ code:'PAYROLL',  label:'Module Paie',     description:'Gestion et calcul de la paie' });
    if (lic.rhEnabled)       rows.push({ code:'RH',       label:'Module RH',       description:'Ressources humaines' });
    if (lic.cnssEnabled) {
      rows.push({ code:'CNSS', label:'Module CNSS', description:'Caisse Nationale de Sécurité Sociale' });
      rows.push({ code:'AMO',  label:'AMO',         description:'Assurance Maladie Obligatoire (associée au module CNSS sur la licence)' });
    }
    if (lic.taxEnabled)      rows.push({ code:'TAXES',    label:'Module Taxes',    description:'Impôt sur le revenu et éléments fiscaux' });
    if (lic.damancomEnabled) rows.push({ code:'DAMANCOM', label:'Module Damancom', description:'Déclarations sociales Damancom' });
    if (lic.cimrEnabled)     rows.push({ code:'CIMR',     label:'Module CIMR',     description:'Caisse Interprofessionnelle Marocaine de Retraite' });
    return rows;
  }

  get licenseSummaryLine(): string {
    const lic = this.licenseApiSnapshot;
    if (!lic?.planCode && lic?.status == null) return '';
    const parts = [lic.planCode, lic.status].filter(Boolean);
    return parts.length ? `Licence : ${parts.join(' · ')}` : '';
  }

  // ── License helpers ──────────────────────────────────────────────────────

  private mapLicenseToModules(lic: LicenseApiResponse): LicenseModulesSnapshot {
    const cnss = !!lic.cnssEnabled;
    return { cnssEnabled: cnss, amoEnabled: cnss, irEnabled: !!lic.taxEnabled, cimrEnabled: !!lic.cimrEnabled, damancomEnabled: !!lic.damancomEnabled };
  }

  tableModulePills(config: PayrollConfig): { label: string; on: boolean; licensedOnly: boolean }[] {
    const lic = this.licenseSnapshotByCompanyId.get(config.companyId);
    if (!lic) return [];
    const pills: { label: string; on: boolean; licensedOnly: boolean }[] = [];
    if (lic.payrollEnabled)  pills.push({ label:'Paie',     on:true,                 licensedOnly:true });
    if (lic.rhEnabled)       pills.push({ label:'RH',       on:true,                 licensedOnly:true });
    if (lic.cnssEnabled) {
      pills.push({ label:'CNSS',     on:!!config.cnssEnabled,     licensedOnly:false });
      pills.push({ label:'AMO',      on:!!config.amoEnabled,      licensedOnly:false });
    }
    if (lic.taxEnabled)      pills.push({ label:'IR',        on:!!config.irEnabled,       licensedOnly:false });
    if (lic.damancomEnabled) pills.push({ label:'Damancom',  on:!!config.damancomEnabled, licensedOnly:false });
    if (lic.cimrEnabled)     pills.push({ label:'CIMR',      on:!!config.cimrEnabled,     licensedOnly:false });
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

  loadLicenseModules(companyId: string) {
    if (!companyId) { this.resetLicenseState(); return; }
    this.licenseLoading = true;
    this.licenseLoadError = '';
    this.licenseModules = null;
    this.licenseApiSnapshot = null;

    // ✅ Le token est injecté par authInterceptor — pas de headers manuels
    this.http.get<LicenseApiResponse>(`${this.licensesUrl}/company/${companyId}`).subscribe({
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
          this.licenseLoadError = typeof msg === 'string' ? msg : (error.message || 'Impossible de charger la licence de cette entreprise.');
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

  // ── Details modal ────────────────────────────────────────────────────────

  openDetails(config: PayrollConfig): void {
    this.detailsConfig = config;
    this.showDetailsModal = true;
    if (config.companyId && !this.licenseSnapshotByCompanyId.has(config.companyId)) {
      this.http.get<LicenseApiResponse>(`${this.licensesUrl}/company/${config.companyId}`)
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
    if ((ev.target as HTMLElement).classList.contains('modal-backdrop--details')) this.closeDetails();
  }

  // ── Data loading ─────────────────────────────────────────────────────────

  private hydrateLicenseMapForConfigs(configs: PayrollConfig[]): void {
    this.licenseSnapshotByCompanyId.clear();
    if (configs.length === 0) return;

    if (this.isSuperAdmin) {
      this.http.get<LicenseApiResponse[]>(this.licensesUrl)
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
    this.http.get<LicenseApiResponse>(`${this.licensesUrl}/company/${cid}`)
      .pipe(catchError(() => of(null)))
      .subscribe((lic) => {
        this.ngZone.run(() => {
          if (lic) this.licenseSnapshotByCompanyId.set(cid, lic);
          this.cdr.detectChanges();
        });
      });
  }

  private async initializeData(): Promise<void> {
    try {
      await this.waitForStableState();
      this.ngZone.run(() => {
        this.loadConfigurations();
        if (this.isSuperAdmin) this.loadCompanies();
      });
      setTimeout(() => this.cdr.detectChanges(), 50);
    } catch (error) {
      console.error('Erreur d\'initialisation:', error);
    }
  }

  private waitForStableState(): Promise<void> {
    return new Promise((resolve) => {
      if (this.ngZone.isStable) {
        setTimeout(() => resolve(), 0);
      } else {
        const sub = this.ngZone.onStable.subscribe(() => { sub.unsubscribe(); setTimeout(() => resolve(), 0); });
      }
    });
  }

  loadCompanies() {
    this.http.get<Company[]>(this.companiesUrl)
      .pipe(catchError((err: HttpErrorResponse) => {
        this.errorMessage = `Erreur chargement entreprises: ${err.status} - ${err.message}`;
        return of([]);
      }))
      .subscribe({
        next: (data) => {
          this.ngZone.run(() => {
            this.companies = data || [];
            this.apiResponded = true;
            this.dataLoaded = true;
            this.cdr.markForCheck();
            this.cdr.detectChanges();
          });
        },
      });
  }

  loadConfigurations() {
    this.loading = true;
    this.errorMessage = '';

    // ✅ Super Admin → /payroll-config/all  (toutes les entreprises)
    // ✅ Admin/autres → /payroll-config     (config de leur entreprise uniquement)
    const url = this.isSuperAdmin ? `${this.apiUrl}/all` : this.apiUrl;

    this.http.get<PayrollConfig[] | PayrollConfig>(url)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 0)        this.errorMessage = '❌ Impossible de se connecter au serveur.';
          else if (error.status === 401) this.errorMessage = '❌ Non authentifié.';
          else if (error.status === 403) this.errorMessage = '❌ Accès non autorisé.';
          else if (error.status === 404) this.errorMessage = '❌ API non trouvée.';
          else                           this.errorMessage = `❌ Erreur ${error.status}: ${error.message}`;
          return of(null);
        }),
        finalize(() => { this.loading = false; })
      )
      .subscribe({
        next: (data) => {
          this.ngZone.run(() => {
            this.errorMessage = '';
            if (data === null) {
              this.configurations = [];
              this.errorMessage = 'Erreur de connexion au serveur.';
            } else if (Array.isArray(data)) {
              // Super Admin reçoit un tableau
              this.configurations = data.map(d => this.normalizePayrollConfigRow(d));
            } else if (typeof data === 'object' && (data as any).id) {
              // Admin reçoit un seul objet
              this.configurations = [this.normalizePayrollConfigRow(data as PayrollConfig)];
            } else {
              this.configurations = [];
              this.errorMessage = 'Format de données invalide.';
            }
            this.dataLoaded = true;
            this.filteredConfigs = [...this.configurations];
            this.hydrateLicenseMapForConfigs(this.configurations);
            this.cdr.markForCheck();
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.ngZone.run(() => {
            this.configurations = [];
            this.filteredConfigs = [];
            this.errorMessage = 'Erreur lors du chargement.';
            this.dataLoaded = true;
            this.cdr.detectChanges();
          });
        }
      });
  }

  forceRefresh() {
    this.configurations = [];
    this.filteredConfigs = [];
    this.companies = [];
    this.dataLoaded = false;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.loadConfigurations();
      if (this.isSuperAdmin) this.loadCompanies();
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
    this.cdr.detectChanges();
  }

  // ── Getters UI ───────────────────────────────────────────────────────────

  getActiveCount(): number { return this.configurations?.filter(c => c.cnssEnabled || c.amoEnabled || c.irEnabled).length || 0; }
  getTotalConfigs(): number { return this.configurations?.length || 0; }
  getCompaniesCount(): number { return this.companies?.length || 0; }
  getCompanyName(config: PayrollConfig): string { return config?.company?.name || config?.companyId?.substring(0, 8) || 'N/A'; }
  getCompanyStatus(config: PayrollConfig): string { return config?.company?.status || 'INACTIVE'; }
  getCompanyDisplayInfo(config: PayrollConfig) { const name=this.getCompanyName(config); const status=this.getCompanyStatus(config); return {name,status,isActive:status==='ACTIVE'}; }

  formatRegime(regime: string): string {
    const map: Record<string,string> = { MOROCCO_STANDARD:'Maroc Standard', MAROC_TRANSPORT:'Maroc Transport', MOROCCO_OFFSHORE:'Maroc Offshore', MOROCCO_AGRICULTURAL:'Maroc Agricole' };
    return map[regime] || regime?.replace(/_/g, ' ') || '—';
  }

  moduleOn(lic: LicenseModulesSnapshot, key: keyof LicenseModulesSnapshot): boolean { return !!lic?.[key]; }
  getModuleClass(enabled: boolean): string { return enabled ? 'pc-module on' : 'pc-module'; }

  // ── Modal CRUD ───────────────────────────────────────────────────────────

  openAddModal() {
    // ✅ Super Admin : choisit l'entreprise dans le select du form
    // ✅ Admin : companyId automatique depuis son JWT, pas de select affiché
    this.editingConfig = null;
    this.errorMessage = '';
    this.resetLicenseState();

    const userCompanyId = this.getUserCompanyId();

    this.configForm.reset({
      // Super Admin : choisit l'entreprise dans le select (visible dans le form)
      // Admin : companyId automatique (champ non affiché dans le form)
      companyId:               this.isSuperAdmin ? '' : userCompanyId,
      regime:                  'MOROCCO_STANDARD',
      currency:                'MAD',
      weeklyHours:             44,
      monthlyHours:            monthlyHoursFromWeekly(44),
      overtimeHoursForRate:    null,
      workingDaysPerMonth:     26,
      defaultCnssDeclaredDays: 26,
      payslipTemplate:         '',
      notes:                   '',
    }, { emitEvent: false });

    this.showModal = true;

    // Pour Admin : charger automatiquement la licence de son entreprise
    if (!this.isSuperAdmin && userCompanyId) this.loadLicenseModules(userCompanyId);
    // Pour Super Admin : s'assurer que la liste des entreprises est prête
    if (this.isSuperAdmin && this.companies.length === 0) this.loadCompanies();
  }

  editConfig(config: PayrollConfig) {
    if (!config) return;
    this.editingConfig = config;
    this.errorMessage = '';
    this.resetLicenseState();

    this.configForm.patchValue({
      companyId:               config.companyId,
      regime:                  config.regime,
      currency:                config.currency,
      weeklyHours:             config.weeklyHours ?? 44,
      monthlyHours:            this.displayMonthlyHours(config.weeklyHours, config.monthlyHours),
      overtimeHoursForRate:    config.overtimeHoursForRate != null ? Number(config.overtimeHoursForRate) : null,
      workingDaysPerMonth:     config.workingDaysPerMonth ?? 26,
      defaultCnssDeclaredDays: config.defaultCnssDeclaredDays ?? 26,
      payslipTemplate:         config.payslipTemplate || '',
      notes:                   config.notes || '',
    }, { emitEvent: false });

    this.showModal = true;
    // Charger la licence de l'entreprise concernée (valable pour Super Admin ET Admin)
    this.loadLicenseModules(config.companyId);
  }

  saveConfig() {
    if (this.configForm.invalid) { this.configForm.markAllAsTouched(); return; }

    const companyIdForSave =
      this.editingConfig?.companyId ??
      (this.isSuperAdmin ? this.configForm.get('companyId')?.value : this.getUserCompanyId());

    if (!this.licenseModules && companyIdForSave) {
      this.loadLicenseModules(companyIdForSave);
      this.errorMessage = 'Chargement de la licence en cours. Patientez puis réessayez.';
      return;
    }
    if (!this.licenseModules) {
      this.errorMessage = 'Impossible d\'enregistrer : licence non disponible.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    const raw = this.configForm.value;
    let overtimeHoursForRate: number | null = null;
    if (raw.overtimeHoursForRate != null && String(raw.overtimeHoursForRate).trim() !== '') {
      const n = Number(raw.overtimeHoursForRate);
      overtimeHoursForRate = Number.isFinite(n) ? n : null;
    }

    const payload = {
      regime:                  raw.regime,
      currency:                raw.currency,
      weeklyHours:             raw.weeklyHours        ? Number(raw.weeklyHours) : null,
      monthlyHours:            raw.monthlyHours       ? Number(raw.monthlyHours) : null,
      overtimeHoursForRate,
      workingDaysPerMonth:     raw.workingDaysPerMonth ? Number(raw.workingDaysPerMonth) : null,
      cnssEnabled:             this.licenseModules.cnssEnabled,
      amoEnabled:              this.licenseModules.amoEnabled,
      irEnabled:               this.licenseModules.irEnabled,
      cimrEnabled:             this.licenseModules.cimrEnabled,
      damancomEnabled:         this.licenseModules.damancomEnabled,
      defaultCnssDeclaredDays: raw.defaultCnssDeclaredDays ? parseInt(raw.defaultCnssDeclaredDays, 10) : 26,
      dateEffet:               raw.dateEffet || new Date().toISOString().slice(0, 10),
      isActive:                Boolean(raw.isActive ?? true),
      payslipTemplate:         raw.payslipTemplate || null,
      notes:                   raw.notes || null,
    };

    let obs: Observable<PayrollConfig>;

    if (this.editingConfig) {
      obs = this.isSuperAdmin
        // ✅ Super Admin : modifie n'importe quelle config par son ID → PUT /:id
        ? this.http.put<PayrollConfig>(`${this.apiUrl}/${this.editingConfig.id}`, payload)
        // ✅ Admin : modifie sa propre config → PUT / (backend utilise req.user.companyId)
        : this.http.put<PayrollConfig>(this.apiUrl, payload);
    } else {
      if (this.isSuperAdmin) {
        const companyId = raw.companyId;
        if (!companyId) { this.errorMessage = 'Veuillez sélectionner une entreprise'; this.saving = false; return; }
        // ✅ Super Admin : crée une config pour l'entreprise choisie → POST / avec companyId dans le body
        obs = this.http.post<PayrollConfig>(this.apiUrl, { ...payload, companyId });
      } else {
        // ✅ Admin : crée sa config → POST / (backend utilise req.user.companyId)
        obs = this.http.post<PayrollConfig>(this.apiUrl, payload);
      }
    }

    obs.subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.saving = false;
          this.successMessage = 'Configuration enregistrée avec succès';
          this.closeModal();
          this.loadConfigurations();
          setTimeout(() => { this.successMessage = ''; this.cdr.detectChanges(); }, 3000);
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.saving = false;
          this.errorMessage = err.error?.error || err.message || 'Erreur lors de la sauvegarde';
          this.cdr.detectChanges();
        });
      }
    });
  }

  deleteConfig(id: string) {
  if (!id || !confirm('Supprimer cette configuration ?')) return;
  
  this.saving = true; // Ajouter un état de chargement
  this.errorMessage = '';
  
  this.http.delete(`${this.apiUrl}/${id}`).subscribe({
    next: () => {
      this.ngZone.run(() => {
        this.saving = false;
        this.successMessage = 'Configuration supprimée avec succès';
        
        // ✅ METHODE 1 : Supprimer directement de la liste locale (plus rapide)
        this.configurations = this.configurations.filter(c => c.id !== id);
        this.filteredConfigs = this.filteredConfigs.filter(c => c.id !== id);
        
        // ✅ METHODE 2 : Ou recharger complètement (plus sûr mais moins performant)
        // this.loadConfigurations();
        
        // Nettoyer le message après 3 secondes
        setTimeout(() => { 
          this.successMessage = ''; 
          this.cdr.detectChanges(); 
        }, 3000);
        
        this.cdr.detectChanges();
      });
    },
    error: (err) => {
      this.ngZone.run(() => {
        this.saving = false;
        this.errorMessage = err.error?.error || err.message || 'Erreur lors de la suppression';
        
        // Afficher l'erreur plus longtemps
        setTimeout(() => { 
          this.errorMessage = ''; 
          this.cdr.detectChanges(); 
        }, 5000);
        
        this.cdr.detectChanges();
      });
    }
  });
}

  closeModal() {
    this.showModal = false;
    this.editingConfig = null;
    this.errorMessage = '';
    this.resetLicenseState();
    this.cdr.detectChanges();
  }

  closeModalOnBackdrop(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) this.closeModal();
  }

  refreshData() { this.forceRefresh(); }

  isFieldInvalid(field: string): boolean {
    const ctrl = this.configForm.get(field);
    return !!(ctrl && ctrl.invalid && ctrl.touched);
  }

  trackById(index: number, item: PayrollConfig): string {
    return item?.id || index.toString();
  }

  // ── Private normalization ────────────────────────────────────────────────

  private displayMonthlyHours(weekly: number | null | undefined, stored: number | null | undefined): number {
    const w = Number(weekly);
    const week = Number.isFinite(w) && w > 0 ? w : 44;
    const auto = monthlyHoursFromWeekly(week);
    if (stored == null) return auto;
    const s = Number(stored);
    if (!Number.isFinite(s)) return auto;
    if (Math.abs(week - 44) < 0.01 && Math.abs(s - 191.33) < 0.05) return auto;
    return s;
  }

  private normalizePayrollConfigRow(c: PayrollConfig): PayrollConfig {
    return { ...c, monthlyHours: this.displayMonthlyHours(c.weeklyHours, c.monthlyHours) };
  }
}