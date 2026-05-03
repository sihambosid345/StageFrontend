import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  ContractService, 
  EmployeeService, 
  CompanyService, 
  DepartmentService,
  PositionService,
  LicenseService, 
  UserService 
} from '../../core/services/domain.services';
import { AuthService } from '../../core/services/auth.service';
import { CONTRACT_TYPE_OPTIONS, CONTRACT_STATUS_OPTIONS, Company } from '../../core/models';
import { SearchableSelectComponent } from '../../shared/searchable-select.component';

@Component({
  selector: 'app-contracts',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchableSelectComponent],
  templateUrl: './contracts.component.html',
  styleUrls: ['./contracts.component.scss']
})
export class ContractsComponent implements OnInit {
  items: any[] = [];
  filtered: any[] = [];
  employees: any[] = [];
  filteredEmployees: any[] = [];
  companies: Company[] = [];
  selectedDepartment: string = '';
  loading = true;
  showModal = false;
  showFilterPanel = false;
  showServiceContractModal = false;
  editing = false;
  editingId = '';
  search = '';
  companyFilterId = '';
  pendingCompanyFilterId = '';
  typeFilter = '';
  pendingTypeFilter = '';
  statusFilter = '';
  pendingStatusFilter = '';
  error = '';
  selectedCompany: any = null;
  selectedLicense: any = null;
  selectedCompanyUsers: any[] = [];

  generatingPdfId: string = '';
  pdfError: string = '';

  showContractDetailsModal = false;
  selectedContract: any = null;
  contractDetailsTab: 'general' | 'remuneration' | 'employe' = 'general';

  readonly typeOptions = CONTRACT_TYPE_OPTIONS;
  readonly statusOptions = CONTRACT_STATUS_OPTIONS;

  cascade = { companyId: '', departmentId: '', positionId: '' };
  activeContractWarning = '';

  cascadeDepartmentsList: any[] = [];
  cascadePositionsList: any[] = [];
  cascadeEmployeesList: any[] = [];

  // ✅ NEW: Store all departments & positions for name resolution
  allDepartments: any[] = [];
  allPositions: any[] = [];

  companySearchTerm: string = '';
  showCompanyDropdown: boolean = false;
  filteredCompanies: any[] = [];

  deptSearchTerm: string = '';
  showDeptDropdown: boolean = false;
  filteredDepartments: any[] = [];

  positionSearchTerm: string = '';
  showPositionDropdown: boolean = false;
  filteredPositions: any[] = [];

  employeeSearchTerm: string = '';
  showEmployeeDropdown: boolean = false;
  filteredCascadeEmployees: any[] = [];

  form: any = this.emptyForm();

  constructor(
    private service: ContractService,
    private employeeService: EmployeeService,
    private companyService: CompanyService,
    private departmentService: DepartmentService,
    private positionService: PositionService,
    private licenseService: LicenseService,
    private userService: UserService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.load();
    this.loadEmployees();
    if (this.auth.isSuperAdmin()) {
      this.loadCompanies();
    }
    // ✅ Load all departments & positions for name display
    this.loadAllDepartments();
    this.loadAllPositions();
  }

  // ═══════════════════════════════════════════════════════
  // CHARGEMENT DES DONNÉES
  // ═══════════════════════════════════════════════════════

  load() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (data) => {
        this.items = data;
        this.applySearch();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  loadEmployees() {
    this.employeeService.getAll().subscribe({
      next: (d) => {
        console.log('✅ Employés chargés:', d);
        this.employees = d;
        this.filteredEmployees = [...this.employees];
        this.updateCascadeEmployees();
        this.cdr.detectChanges();
      }
    });
  }

  loadCompanies() {
    this.companyService.getAll().subscribe({
      next: (data) => {
        console.log('✅ Entreprises chargées:', data);
        this.companies = data;
        this.filteredCompanies = [...this.companies];
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading companies:', err)
    });
  }

  // ✅ Load all departments
  loadAllDepartments() {
    this.departmentService.getAll().subscribe({
      next: (departments) => {
        this.allDepartments = departments || [];
        console.log('✅ All departments loaded:', this.allDepartments.length);
      },
      error: (err) => console.error('Error loading departments:', err)
    });
  }

  // ✅ Load all positions
  loadAllPositions() {
    this.positionService.getAll().subscribe({
      next: (positions) => {
        this.allPositions = positions || [];
        console.log('✅ All positions loaded:', this.allPositions.length);
      },
      error: (err) => console.error('Error loading positions:', err)
    });
  }

  // ═══════════════════════════════════════════════════════
  // CASCADE STRICTE
  // ═══════════════════════════════════════════════════════

  onCascadeCompanyChange() {
    console.log('🏢 onCascadeCompanyChange - companyId:', this.cascade.companyId);
    this.cascade.departmentId = '';
    this.cascade.positionId = '';
    this.form.employeeId = '';
    this.activeContractWarning = '';
    this.deptSearchTerm = '';
    this.positionSearchTerm = '';
    this.employeeSearchTerm = '';
    this.cascadePositionsList = [];
    this.filteredPositions = [];
    this.cascadeEmployeesList = [];
    this.filteredCascadeEmployees = [];
    
    if (this.cascade.companyId) {
      this.loadDepartmentsForCompany(this.cascade.companyId);
    } else {
      this.cascadeDepartmentsList = [];
      this.filteredDepartments = [];
    }
    
    this.cdr.detectChanges();
  }

  onCascadeDepartmentChange() {
    console.log('📁 onCascadeDepartmentChange - departmentId:', this.cascade.departmentId);
    this.cascade.positionId = '';
    this.form.employeeId = '';
    this.activeContractWarning = '';
    this.positionSearchTerm = '';
    this.employeeSearchTerm = '';
    this.cascadeEmployeesList = [];
    this.filteredCascadeEmployees = [];
    
    if (this.cascade.departmentId) {
      this.loadPositionsForDepartment(this.cascade.departmentId);
    } else {
      this.cascadePositionsList = [];
      this.filteredPositions = [];
    }
    
    this.cdr.detectChanges();
  }

  onCascadePositionChange() {
    console.log('👤 onCascadePositionChange - positionId:', this.cascade.positionId);
    this.form.employeeId = '';
    this.activeContractWarning = '';
    this.employeeSearchTerm = '';
    this.updateCascadeEmployees();
    this.cdr.detectChanges();
  }

  // ═══════════════════════════════════════════════════════
  // CHARGEMENT API + FALLBACK
  // ═══════════════════════════════════════════════════════

  loadDepartmentsForCompany(companyId: string) {
    console.log('🔍 loadDepartmentsForCompany - companyId:', companyId);
    this.cascadeDepartmentsList = [];
    this.filteredDepartments = [];
    
    this.departmentService.getByCompany(companyId).subscribe({
      next: (departments) => {
        console.log('✅ API départements réponse:', departments);
        if (departments && departments.length > 0) {
          this.setDepartmentsList(departments);
        } else {
          console.warn('⚠️ API retourné 0 départements, fallback employés');
          this.extractDepartmentsFromEmployees(companyId);
        }
      },
      error: (err) => {
        console.error('❌ API départements erreur:', err);
        this.extractDepartmentsFromEmployees(companyId);
      }
    });
  }

  loadPositionsForDepartment(departmentId: string) {
    console.log('🔍 loadPositionsForDepartment - departmentId:', departmentId);
    this.cascadePositionsList = [];
    this.filteredPositions = [];
    
    this.positionService.getByDepartment(departmentId).subscribe({
      next: (positions) => {
        console.log('✅ API postes réponse:', positions);
        if (positions && positions.length > 0) {
          this.setPositionsList(positions);
        } else {
          console.warn('⚠️ API retourné 0 postes, fallback employés');
          this.extractPositionsFromEmployees(departmentId);
        }
      },
      error: (err) => {
        console.error('❌ API postes erreur:', err);
        this.extractPositionsFromEmployees(departmentId);
      }
    });
  }

  setDepartmentsList(departments: any[]) {
    console.log('📋 setDepartmentsList - entrée:', departments);
    this.cascadeDepartmentsList = departments.map(d => ({ id: d.id, name: d.name }));
    this.filteredDepartments = [...this.cascadeDepartmentsList];
    console.log('📋 cascadeDepartmentsList:', this.cascadeDepartmentsList);
    this.cdr.detectChanges();
  }

  setPositionsList(positions: any[]) {
    console.log('📋 setPositionsList - entrée:', positions);
    this.cascadePositionsList = positions.map(p => ({ 
      id: p.id, 
      name: p.name || (p as any).title || p.id 
    }));
    this.filteredPositions = [...this.cascadePositionsList];
    console.log('📋 cascadePositionsList:', this.cascadePositionsList);
    this.cdr.detectChanges();
  }

  extractDepartmentsFromEmployees(companyId: string) {
    console.log('📋 extractDepartmentsFromEmployees - companyId:', companyId);
    console.log('📋 Tous les employés:', this.employees);
    
    const deptMap = new Map<string, any>();
    this.employees
      .filter(emp => {
        const empCompanyId = emp.companyId || emp.company?.id;
        const match = empCompanyId === companyId;
        console.log(`  Employé ${emp.firstName} ${emp.lastName}: empCompanyId=${empCompanyId}, recherche=${companyId}, match=${match}`);
        return match;
      })
      .forEach(emp => {
        if (emp.department?.id) {
          deptMap.set(emp.department.id, { id: emp.department.id, name: emp.department.name || emp.department.id });
        } else if (emp.departmentId) {
          deptMap.set(emp.departmentId, { id: emp.departmentId, name: emp.department || emp.departmentId });
        }
      });
    
    this.cascadeDepartmentsList = Array.from(deptMap.values());
    this.filteredDepartments = [...this.cascadeDepartmentsList];
    console.log('📋 Départements extraits:', this.cascadeDepartmentsList);
    this.cdr.detectChanges();
  }

  extractPositionsFromEmployees(departmentId: string) {
    console.log('📋 extractPositionsFromEmployees - departmentId:', departmentId);
    
    const posMap = new Map<string, any>();
    let list = [...this.employees];
    
    if (this.cascade.companyId) {
      list = list.filter(emp => (emp.companyId || emp.company?.id) === this.cascade.companyId);
    }
    list = list.filter(emp => (emp.departmentId || emp.department?.id) === departmentId);
    
    console.log(`📋 ${list.length} employés filtrés`);
    
    list.forEach(emp => {
      if (emp.position?.id) {
        posMap.set(emp.position.id, { id: emp.position.id, name: emp.position.name || emp.position.title || emp.position.id });
      } else if (emp.positionId) {
        posMap.set(emp.positionId, { id: emp.positionId, name: emp.position || emp.positionId });
      }
    });
    
    this.cascadePositionsList = Array.from(posMap.values());
    this.filteredPositions = [...this.cascadePositionsList];
    console.log('📋 Postes extraits:', this.cascadePositionsList);
    this.cdr.detectChanges();
  }

  updateCascadeEmployees() {
    console.log('👥 updateCascadeEmployees');
    let list = [...this.employees];
    console.log(`  Tous les employés: ${list.length}`);
    
    if (this.cascade.companyId) {
      list = list.filter(e => (e.companyId || e.company?.id) === this.cascade.companyId);
      console.log(`  Après filtre entreprise: ${list.length}`);
    }
    if (this.cascade.departmentId) {
      list = list.filter(e => (e.departmentId || e.department?.id) === this.cascade.departmentId);
      console.log(`  Après filtre département: ${list.length}`);
    }
    if (this.cascade.positionId) {
      list = list.filter(e => (e.positionId || e.position?.id) === this.cascade.positionId);
      console.log(`  Après filtre poste: ${list.length}`);
    }
    
    this.cascadeEmployeesList = list;
    this.filteredCascadeEmployees = [...list];
    console.log('  Employés finaux:', this.cascadeEmployeesList);
  }

  get cascadeDepartments(): any[] { return this.cascadeDepartmentsList; }
  get cascadePositions(): any[]   { return this.cascadePositionsList; }
  get cascadeEmployees(): any[]   { return this.cascadeEmployeesList; }

  // ═══════════════════════════════════════════════════════
  // SÉLECTION EMPLOYÉ
  // ═══════════════════════════════════════════════════════

  onEmployeeSelect() {
    this.activeContractWarning = '';
    if (!this.form.employeeId) return;
    const existingActive = this.items.find(c =>
      c.employeeId === this.form.employeeId &&
      c.status === 'ACTIVE' &&
      c.id !== this.editingId
    );
    if (existingActive) {
      const emp = this.employees.find(e => e.id === this.form.employeeId);
      const name = emp ? `${emp.firstName} ${emp.lastName}` : 'Cet employé';
      this.activeContractWarning = `${name} possède déjà un contrat ACTIF (${existingActive.contractType}, depuis le ${new Date(existingActive.startDate).toLocaleDateString('fr-FR')}). Chaque employé ne peut avoir qu'un seul contrat actif.`;
    }
    this.cdr.detectChanges();
  }

  // ═══════════════════════════════════════════════════════
  // DROPDOWN RECHERCHE
  // ═══════════════════════════════════════════════════════

  filterCompanies() {
    const term = this.companySearchTerm.toLowerCase();
    this.filteredCompanies = this.companies.filter(c => c.name.toLowerCase().includes(term));
    this.showCompanyDropdown = true;
  }

  filterDepartments() {
    const term = this.deptSearchTerm.toLowerCase();
    this.filteredDepartments = this.cascadeDepartmentsList.filter(d => d.name.toLowerCase().includes(term));
    this.showDeptDropdown = true;
  }

  filterPositions() {
    const term = this.positionSearchTerm.toLowerCase();
    this.filteredPositions = this.cascadePositionsList.filter(p => p.name.toLowerCase().includes(term));
    this.showPositionDropdown = true;
  }

  filterEmployees() {
    const term = this.employeeSearchTerm.toLowerCase();
    this.filteredCascadeEmployees = this.cascadeEmployeesList.filter(e =>
      `${e.firstName} ${e.lastName} ${e.employeeCode || ''}`.toLowerCase().includes(term)
    );
    this.showEmployeeDropdown = true;
  }

  closeDropdown(name: string) {
    setTimeout(() => {
      switch (name) {
        case 'company':  this.showCompanyDropdown  = false; break;
        case 'dept':     this.showDeptDropdown     = false; break;
        case 'position': this.showPositionDropdown = false; break;
        case 'employee': this.showEmployeeDropdown = false; break;
      }
      this.cdr.detectChanges();
    }, 200);
  }

  selectCompany(c: any)  { 
    console.log('🏢 selectCompany:', c);
    this.cascade.companyId = c.id; 
    this.companySearchTerm = c.name; 
    this.showCompanyDropdown = false; 
    this.onCascadeCompanyChange(); 
  }
  
  selectDepartment(d: any) { 
    console.log('📁 selectDepartment:', d);
    this.cascade.departmentId = d.id; 
    this.deptSearchTerm = d.name; 
    this.showDeptDropdown = false; 
    this.onCascadeDepartmentChange(); 
  }
  
  selectPosition(p: any)   { 
    console.log('👤 selectPosition:', p);
    this.cascade.positionId = p.id; 
    this.positionSearchTerm = p.name; 
    this.showPositionDropdown = false; 
    this.onCascadePositionChange(); 
  }
  
  selectEmployee(e: any)   { 
    console.log('👨‍💼 selectEmployee:', e);
    this.form.employeeId = e.id; 
    this.employeeSearchTerm = `${e.firstName} ${e.lastName}`; 
    this.showEmployeeDropdown = false; 
    this.onEmployeeSelect(); 
  }

  getCompanyName(id: string): string    { return this.companies.find(c => c.id === id)?.name ?? ''; }
  getDepartmentName(id: string): string { return this.cascadeDepartmentsList.find(d => d.id === id)?.name ?? ''; }
  getPositionName(id: string): string   { return this.cascadePositionsList.find(p => p.id === id)?.name ?? ''; }
  getSelectedEmployeeName(): string     { const e = this.employees.find(x => x.id === this.form.employeeId); return e ? `${e.firstName} ${e.lastName}` : ''; }

  // ═══════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════

  getEmployeeName(id: string): string { 
    const e = this.employees.find(x => x.id === id); 
    return e ? `${e.firstName} ${e.lastName}` : 'Chargement...'; 
  }
  
  getEmployeeCin(id: string): string { 
    return this.employees.find(e => e.id === id)?.cin || '—'; 
  }
  
  getEmployeeEmail(id: string): string { 
    return this.employees.find(e => e.id === id)?.email || '—'; 
  }
  
  getEmployeePhone(id: string): string { 
    return this.employees.find(e => e.id === id)?.phone || '—'; 
  }

  getEmployeeDepartmentId(id: string): string | undefined {
    const e = this.employees.find(x => x.id === id);
    return e?.departmentId || e?.department?.id || undefined;
  }

  getEmployeePositionId(id: string): string | undefined {
    const e = this.employees.find(x => x.id === id);
    return e?.positionId || e?.position?.id || undefined;
  }

  // ✅ FIXED: Now checks allDepartments, cascadeList, and employee data
  departmentName(id?: string): string {
    if (!id) return '—';
    
    // 1. Check allDepartments (always loaded)
    const dept = this.allDepartments.find(d => d.id === id);
    if (dept) return dept.name;
    
    // 2. Check cascade list (populated during create/edit)
    const fromCascade = this.cascadeDepartmentsList.find(d => d.id === id);
    if (fromCascade) return fromCascade.name;
    
    // 3. Check employee's department property
    for (const emp of this.employees) {
      if (emp.department?.id === id) return emp.department.name;
      if (emp.departmentId === id && typeof emp.department === 'string') return emp.department;
    }
    
    // 4. Fallback - show ID
    return id;
  }

  // ✅ FIXED: Now checks allPositions, cascadeList, and employee data
  positionName(id?: string): string {
    if (!id) return '—';
    
    // 1. Check allPositions (always loaded)
    const pos = this.allPositions.find(p => p.id === id);
    if (pos) return pos.name || pos.title;
    
    // 2. Check cascade list (populated during create/edit)
    const fromCascade = this.cascadePositionsList.find(p => p.id === id);
    if (fromCascade) return fromCascade.name;
    
    // 3. Check employee's position property
    for (const emp of this.employees) {
      if (emp.position?.id === id) return emp.position.name || emp.position.title;
      if (emp.positionId === id && typeof emp.position === 'string') return emp.position;
    }
    
    // 4. Fallback - show ID
    return id;
  }

  companyName(id: string): string { 
    return this.companies.find(c => c.id === id)?.name ?? '—'; 
  }
  
  get isSuperAdmin(): boolean { 
    return this.auth.isSuperAdmin(); 
  }

  statusClass(s: string): string {
    const m: any = { ACTIVE: 'badge-success', DRAFT: 'badge-secondary', ENDED: 'badge-danger', SUSPENDED: 'badge-warning', TERMINATED: 'badge-danger' };
    return m[s] ?? 'badge-secondary';
  }

  typeClass(t: string): string {
    const m: any = { CDI: 'badge-success', CDD: 'badge-info', STAGE: 'badge-warning', INTERIM: 'badge-purple', FREELANCE: 'badge-secondary' };
    return m[t] ?? 'badge-secondary';
  }

  formatDate(d: string): string { 
    if (!d) return '—'; 
    try { 
      return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }); 
    } catch { 
      return d; 
    } 
  }
  
  formatMoney(a: number | null | undefined): string { 
    if (a == null) return '—'; 
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(a) + ' MAD'; 
  }

  // ═══════════════════════════════════════════════════════
  // MODAL CRUD
  // ═══════════════════════════════════════════════════════

  emptyForm() {
    return {
      employeeId: '', contractType: 'CDI', status: 'ACTIVE',
      startDate: new Date().toISOString().slice(0, 10), endDate: '',
      baseSalary: null, hoursPerMonth: 191, workingDaysPerMonth: 26,
      transportAllowance: null, notes: ''
    };
  }

  openCreate() {
    console.log('📝 openCreate');
    this.form = this.emptyForm();
    this.cascade = { companyId: '', departmentId: '', positionId: '' };
    this.editing = false; this.editingId = ''; this.error = ''; this.pdfError = '';
    this.activeContractWarning = '';
    this.companySearchTerm = ''; this.deptSearchTerm = ''; this.positionSearchTerm = ''; this.employeeSearchTerm = '';
    this.showCompanyDropdown = false; this.showDeptDropdown = false; this.showPositionDropdown = false; this.showEmployeeDropdown = false;
    this.cascadeDepartmentsList = []; this.cascadePositionsList = [];
    this.filteredDepartments = []; this.filteredPositions = [];
    this.cascadeEmployeesList = [...this.employees];
    this.filteredCascadeEmployees = [...this.employees];
    this.showModal = true;
    this.cdr.detectChanges();
  }

  openEdit(item: any) {
    console.log('✏️ openEdit:', item);
    const emp = this.employees.find(e => e.id === item.employeeId);
    this.cascade = {
      companyId: emp?.companyId ?? emp?.company?.id ?? '',
      departmentId: emp?.departmentId ?? emp?.department?.id ?? '',
      positionId: emp?.positionId ?? emp?.position?.id ?? ''
    };
    if (this.cascade.companyId) this.loadDepartmentsForCompany(this.cascade.companyId);
    if (this.cascade.departmentId) this.loadPositionsForDepartment(this.cascade.departmentId);
    this.updateCascadeEmployees();
    this.form = {
      employeeId: item.employeeId, contractType: item.contractType, status: item.status,
      startDate: item.startDate?.slice(0, 10), endDate: item.endDate?.slice(0, 10) ?? '',
      baseSalary: item.baseSalary, hoursPerMonth: item.hoursPerMonth ?? 191,
      workingDaysPerMonth: item.workingDaysPerMonth ?? 26, transportAllowance: item.transportAllowance ?? null, notes: item.notes ?? ''
    };
    this.editing = true; this.editingId = item.id; this.error = ''; this.pdfError = '';
    this.activeContractWarning = '';
    this.companySearchTerm = this.getCompanyName(this.cascade.companyId);
    this.deptSearchTerm = ''; this.positionSearchTerm = '';
    this.employeeSearchTerm = this.getEmployeeName(item.employeeId);
    this.showModal = true;
    this.cdr.detectChanges();
  }

  close() { this.showModal = false; this.cdr.detectChanges(); }

  viewContractDetails(contract: any) {
    this.selectedContract = contract; 
    this.contractDetailsTab = 'general';
    this.showContractDetailsModal = true; 
    this.pdfError = '';
    
    // ✅ Refresh departments & positions if needed
    if (this.allDepartments.length === 0) {
      this.loadAllDepartments();
    }
    if (this.allPositions.length === 0) {
      this.loadAllPositions();
    }
    
    this.cdr.detectChanges();
  }

  closeContractDetails() { 
    this.showContractDetailsModal = false; 
    this.selectedContract = null; 
    this.cdr.detectChanges(); 
  }

  openEditFromContractDetails() { 
    if (this.selectedContract) { 
      this.closeContractDetails(); 
      this.openEdit(this.selectedContract); 
    } 
  }

  // ═══════════════════════════════════════════════════════
  // PDF
  // ═══════════════════════════════════════════════════════

  generateEmployeeContract(contract: any) {
    if (!contract?.id) return;
    this.generatingPdfId = contract.id; this.pdfError = ''; this.cdr.detectChanges();
    this.service.generatePdf(contract.id).subscribe({
      next: (res) => {
        this.service.downloadPdf(res.filename).subscribe({
          next: (blob: Blob) => { this.triggerDownload(blob, res.filename); this.generatingPdfId = ''; this.cdr.detectChanges(); },
          error: () => { this.pdfError = 'Impossible de télécharger le PDF.'; this.generatingPdfId = ''; this.cdr.detectChanges(); }
        });
      },
      error: (err) => { this.pdfError = err?.error?.error || 'Erreur lors de la génération du contrat PDF.'; this.generatingPdfId = ''; this.cdr.detectChanges(); }
    });
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  // ═══════════════════════════════════════════════════════
  // RECHERCHE ET FILTRES
  // ═══════════════════════════════════════════════════════

  applySearch() {
    const q = this.search.toLowerCase();
    this.filtered = this.items.filter(i => {
      const matchSearch = q ? this.getEmployeeName(i.employeeId).toLowerCase().includes(q) || i.contractType?.toLowerCase().includes(q) || i.status?.toLowerCase().includes(q) : true;
      const emp = this.employees.find(e => e.id === i.employeeId);
      return matchSearch && (this.companyFilterId ? emp?.companyId === this.companyFilterId : true) && (this.typeFilter ? i.contractType === this.typeFilter : true) && (this.statusFilter ? i.status === this.statusFilter : true);
    });
  }

  onSearch() { this.applySearch(); }
  openFilterPanel() { this.pendingCompanyFilterId = this.companyFilterId; this.pendingTypeFilter = this.typeFilter; this.pendingStatusFilter = this.statusFilter; this.showFilterPanel = true; }
  closeFilterPanel() { this.showFilterPanel = false; }
  togglePendingCompanySelection(id: string) { this.pendingCompanyFilterId = this.pendingCompanyFilterId === id ? '' : id; }
  togglePendingTypeSelection(t: string) { this.pendingTypeFilter = this.pendingTypeFilter === t ? '' : t; }
  togglePendingStatusSelection(s: string) { this.pendingStatusFilter = this.pendingStatusFilter === s ? '' : s; }
  applyPendingFilters() { this.companyFilterId = this.pendingCompanyFilterId; this.typeFilter = this.pendingTypeFilter; this.statusFilter = this.pendingStatusFilter; this.showFilterPanel = false; this.applySearch(); }
  resetPendingFilters() { this.pendingCompanyFilterId = ''; this.pendingTypeFilter = ''; this.pendingStatusFilter = ''; }
  clearCompanyFilter() { this.companyFilterId = ''; this.applySearch(); }
  clearTypeFilter() { this.typeFilter = ''; this.applySearch(); }
  clearStatusFilter() { this.statusFilter = ''; this.applySearch(); }

  // ═══════════════════════════════════════════════════════
  // SAUVEGARDE
  // ═══════════════════════════════════════════════════════

  save() {
    if (this.activeContractWarning) { this.error = "Impossible de créer ce contrat car l'employé a déjà un contrat actif."; this.cdr.detectChanges(); return; }
    if (!this.form.employeeId) { this.error = 'Veuillez sélectionner un employé.'; this.cdr.detectChanges(); return; }
    if (!this.form.contractType) { this.error = 'Veuillez sélectionner un type de contrat.'; this.cdr.detectChanges(); return; }
    if (!this.form.startDate) { this.error = 'Veuillez renseigner la date de début.'; this.cdr.detectChanges(); return; }
    if (!this.form.baseSalary || this.form.baseSalary <= 0) { this.error = 'Veuillez renseigner un salaire de base valide.'; this.cdr.detectChanges(); return; }
    if (this.form.status === 'ACTIVE') {
      const exist = this.items.find(c => c.employeeId === this.form.employeeId && c.status === 'ACTIVE' && c.id !== this.editingId);
      if (exist) { this.error = "Cet employé a déjà un contrat actif."; this.cdr.detectChanges(); return; }
    }
    const employee = this.employees.find(e => e.id === this.form.employeeId);
    const payload: any = { companyId: employee?.companyId ?? this.auth.currentUser()?.companyId, employeeId: this.form.employeeId, contractType: this.form.contractType, status: this.form.status, startDate: this.form.startDate, baseSalary: +this.form.baseSalary };
    if (this.form.endDate) payload.endDate = this.form.endDate;
    if (this.form.hoursPerMonth) payload.hoursPerMonth = +this.form.hoursPerMonth;
    if (this.form.workingDaysPerMonth) payload.workingDaysPerMonth = +this.form.workingDaysPerMonth;
    if (this.form.transportAllowance) payload.transportAllowance = +this.form.transportAllowance;
    if (this.form.notes) payload.notes = this.form.notes;
    const obs = this.editing ? this.service.update(this.editingId, payload) : this.service.create(payload);
    obs.subscribe({ next: () => { this.showModal = false; this.load(); this.cdr.detectChanges(); }, error: (e) => { this.error = e?.error?.error || 'Erreur serveur'; this.cdr.detectChanges(); } });
  }

  delete(id: string) { if (!confirm('Supprimer ce contrat ?')) return; this.service.delete(id).subscribe(() => this.load()); }

  // ═══════════════════════════════════════════════════════
  // MODAL CONTRAT DE SERVICE
  // ═══════════════════════════════════════════════════════

  openServiceContractModal() { this.showServiceContractModal = true; this.cdr.detectChanges(); }
  closeServiceContractModal() { this.showServiceContractModal = false; this.selectedCompany = null; this.selectedLicense = null; this.selectedCompanyUsers = []; this.cdr.detectChanges(); }
  onCompanySelect(companyId: string) { this.selectedCompany = this.companies.find(c => c.id === companyId); if (this.selectedCompany) { this.loadCompanyLicense(this.selectedCompany.id); this.loadCompanyUsers(this.selectedCompany.id); } }
  loadCompanyLicense(companyId: string) { this.licenseService.getByCompany(companyId).subscribe({ next: (l) => this.selectedLicense = l, error: (e) => console.error(e) }); }
  loadCompanyUsers(companyId: string) { this.userService.getAll().subscribe({ next: (u) => this.selectedCompanyUsers = u.filter(x => x.companyId === companyId), error: (e) => console.error(e) }); }
}