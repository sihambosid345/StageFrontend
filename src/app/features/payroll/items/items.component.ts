import { Component, OnInit, ChangeDetectorRef, NgZone, ApplicationRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PayrollItemService, PayrollRunService, EmployeeService } from '../../../core/services/domain.services';
import { AuthService } from '../../../core/services/auth.service';
import { PAYROLL_ITEM_TYPE_OPTIONS } from '../../../core/models';

@Component({
  selector: 'app-items',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './items.component.html',
  styleUrls: ['./items.component.scss']
})
export class ItemsComponent implements OnInit {
  items: any[] = [];
  filtered: any[] = [];
  employees: any[] = [];
  runs: any[] = [];
  loading = true;
  showModal = false;
  editing = false;
  editingId = '';
  search = '';
  error = '';

  readonly itemTypeOptions = PAYROLL_ITEM_TYPE_OPTIONS;

  form: any = {
    payrollRunId: '', employeeId: '',
    itemType: 'BASE_SALARY', label: '', amount: 0,
    taxable: false, cnssApplicable: false
  };

  constructor(
    private service: PayrollItemService,
    private runService: PayrollRunService,
    private employeeService: EmployeeService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private appRef: ApplicationRef  // ✅ Ajouté pour forcer le rafraîchissement global
  ) {}

  ngOnInit() {
    console.log('🟢 ItemsComponent - INIT');
    
    // ✅ Solution 1: requestAnimationFrame
    requestAnimationFrame(() => {
      this.ngZone.run(() => {
        this.loadAll();
      });
    });

    // ✅ Solution 2: Double chargement après 100ms
    setTimeout(() => {
      if (this.items.length === 0) {
        console.log('⚠️ Rechargement de sécurité...');
        this.loadAll();
      }
    }, 100);

    // ✅ Solution 3: Vérification finale après 500ms
    setTimeout(() => {
      if (this.items.length === 0) {
        console.log('⚠️ Dernier rechargement...');
        this.loadAll();
        this.appRef.tick(); // Force le rafraîchissement global
      }
    }, 500);
  }

  // ✅ Méthode unique pour tout charger
  loadAll() {
    this.ngZone.run(() => {
      this.loadItems();
      this.loadEmployees();
      this.loadRuns();
    });
  }

  loadEmployees() {
    this.employeeService.getAll().subscribe({ 
      next: (d) => { 
        this.ngZone.run(() => {
          this.employees = d || [];
          console.log('✅ Employés chargés:', this.employees.length);
          this.forceRefresh();
        });
      }, 
      error: (err) => {
        console.error('❌ Erreur chargement employés:', err);
        this.employees = [];
      }
    });
  }

  loadRuns() {
    this.runService.getAll().subscribe({ 
      next: (d) => { 
        this.ngZone.run(() => {
          this.runs = d || [];
          console.log('✅ Runs chargés:', this.runs.length);
          
          // ✅ Debug: Vérifier que les runs ont bien companyId
          this.runs.forEach(run => {
            console.log(`Run ${run.id}: companyId=${run.companyId}, company=`, run.company);
          });
          
          this.forceRefresh();
        });
      }, 
      error: (err) => {
        console.error('❌ Erreur chargement runs:', err);
        this.runs = [];
      }
    });
  }

  loadItems() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (data) => { 
        this.ngZone.run(() => {
          this.items = data || []; 
          console.log('✅ Items chargés:', this.items.length);
          this.applySearch(); 
          this.loading = false;
          this.forceRefresh();
        });
      },
      error: (err) => { 
        this.ngZone.run(() => {
          console.error('❌ Erreur chargement items:', err);
          this.loading = false;
          this.forceRefresh();
        });
      }
    });
  }

  // ✅ Méthode de rafraîchissement forcé
  forceRefresh() {
    this.cdr.markForCheck();
    this.cdr.detectChanges();
    
    // Double vérification après 10ms
    setTimeout(() => {
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    }, 10);
  }

  applySearch() {
    const q = this.search.toLowerCase();
    this.filtered = q
      ? this.items.filter(i =>
          i.label?.toLowerCase().includes(q) ||
          i.itemType?.toLowerCase().includes(q) ||
          this.getEmployeeName(i.employeeId).toLowerCase().includes(q)
        )
      : [...this.items];
    
    console.log('🔍 Recherche:', this.filtered.length, 'résultats');
    this.forceRefresh();
  }

  onSearch() { 
    this.applySearch(); 
  }

  getEmployeeName(id: string): string {
    const e = this.employees.find(e => e.id === id);
    return e ? `${e.firstName} ${e.lastName}` : id;
  }

  getRunLabel(id: string): string {
    const r = this.runs.find(r => r.id === id);
    return r ? `Run #${r.runNumber} (${r.status})` : id;
  }

  openCreate() {
    this.form = { 
      payrollRunId: '', 
      employeeId: '', 
      itemType: 'BASE_SALARY', 
      label: '', 
      amount: 0, 
      taxable: false, 
      cnssApplicable: false 
    };
    this.editing = false; 
    this.editingId = ''; 
    this.error = '';
    this.showModal = true;
    this.forceRefresh();
  }

  openEdit(item: any) {
    this.form = {
      payrollRunId: item.payrollRunId, 
      employeeId: item.employeeId,
      itemType: item.itemType, 
      label: item.label, 
      amount: item.amount,
      taxable: item.taxable, 
      cnssApplicable: item.cnssApplicable
    };
    this.editing = true; 
    this.editingId = item.id; 
    this.error = '';
    this.showModal = true;
    this.forceRefresh();
  }

  save() {
    // Validation de base
    if (!this.form.payrollRunId || !this.form.employeeId || !this.form.label) {
      this.error = 'Exécution, employé et libellé sont obligatoires.'; 
      return;
    }

    // ✅ RÉCUPÉRER LE COMPANYID DEPUIS LE PAYROLLRUN PARENT
    const selectedRun = this.runs.find(r => r.id === this.form.payrollRunId);
    
    console.log('🔍 Run sélectionné:', selectedRun);
    
    if (!selectedRun) {
      this.error = 'Exécution de paie introuvable.';
      return;
    }

    // ✅ Essayer plusieurs sources pour le companyId
    let companyId = selectedRun.companyId 
      || selectedRun.company?.id 
      || null;
    
    console.log('📊 companyId trouvé:', companyId);

    // ✅ Si toujours pas de companyId, le backend le gérera
    const payload: any = {
      companyId: companyId,  // Peut être null, le backend va le récupérer
      payrollRunId: this.form.payrollRunId,
      employeeId: this.form.employeeId,
      itemType: this.form.itemType,
      label: this.form.label,
      amount: +this.form.amount,
      taxable: this.form.taxable,
      cnssApplicable: this.form.cnssApplicable,
    };

    console.log('📦 Payload envoyé:', payload);

    const obs = this.editing
      ? this.service.update(this.editingId, payload)
      : this.service.create(payload);
      
    obs.subscribe({
      next: () => { 
        this.ngZone.run(() => {
          console.log('✅ Sauvegarde réussie');
          this.showModal = false; 
          this.loadAll();
          this.forceRefresh();
        });
      },
      error: (e) => { 
        this.ngZone.run(() => {
          console.error('❌ Erreur sauvegarde:', e);
          this.error = e?.error?.error || 'Erreur serveur'; 
          this.forceRefresh();
        });
      }
    });
  }

  delete(id: string) {
    if (!confirm('Supprimer cette ligne de paie ?')) return;
    this.service.delete(id).subscribe({
      next: () => {
        this.ngZone.run(() => {
          console.log('✅ Suppression réussie');
          this.loadAll();
          this.forceRefresh();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          console.error('❌ Erreur suppression:', err);
          this.error = err?.error?.error || 'Erreur serveur';
          this.forceRefresh();
        });
      }
    });
  }

  close() { 
    this.showModal = false; 
    this.forceRefresh();
  }

  itemTypeClass(t: string): string {
    const m: any = { 
      BASE_SALARY: 'badge-info', 
      ALLOWANCE: 'badge-success', 
      BONUS: 'badge-purple', 
      OVERTIME: 'badge-warning', 
      DEDUCTION: 'badge-danger', 
      ADVANCE: 'badge-warning', 
      TAX: 'badge-danger', 
      CNSS: 'badge-secondary', 
      AMO: 'badge-secondary', 
      OTHER: 'badge-secondary' 
    };
    return m[t] ?? 'badge-secondary';
  }

  // ✅ Méthode de rafraîchissement manuel (à appeler depuis le template si nécessaire)
  manualRefresh() {
    console.log('🔄 Rafraîchissement manuel...');
    this.loadAll();
    this.appRef.tick();
    this.forceRefresh();
  }
}