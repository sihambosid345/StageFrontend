import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PayrollRunService, PayrollPeriodService } from '../../../core/services/domain.services';
import { AuthService } from '../../../core/services/auth.service';
import { PAYROLL_RUN_STATUS_OPTIONS } from '../../../core/models';

@Component({
  selector: 'app-runs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './runs.component.html',
  styleUrls: ['./runs.component.scss']
})
export class RunsComponent implements OnInit {
  items: any[] = [];
  filtered: any[] = [];
  periods: any[] = [];
  loading = true;
  showModal = false;
  editing = false;
  editingId = '';
  search = '';
  error = '';

  readonly statusOptions = PAYROLL_RUN_STATUS_OPTIONS;

  form: any = {
    payrollPeriodId: '',
    status: 'DRAFT',
    runNumber: 1,
    notes: ''
  };

  constructor(
    private service: PayrollRunService,
    private periodService: PayrollPeriodService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef,  // ✅ Ajouté pour la détection de changement
    private ngZone: NgZone            // ✅ Ajouté pour éviter les erreurs
  ) {}

  ngOnInit() {
    // ✅ Chargement initial avec détection de changement forcée
    requestAnimationFrame(() => {
      this.load();
      this.periodService.getAll().subscribe({ 
        next: (d) => { 
          this.ngZone.run(() => {
            this.periods = d; 
            this.cdr.markForCheck();
            this.cdr.detectChanges();
          });
        }, 
        error: () => {} 
      });
    });

    // ✅ Double chargement de sécurité
    setTimeout(() => {
      if (this.items.length === 0) {
        this.load();
      }
    }, 100);
  }

  load() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (data) => { 
        this.ngZone.run(() => {
          this.items = data; 
          this.applySearch(); 
          this.loading = false;
          
          // ✅ Forcer la détection de changement
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
      },
      error: () => { 
        this.ngZone.run(() => {
          this.loading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  applySearch() {
    const q = this.search.toLowerCase();
    this.filtered = q
      ? this.items.filter(i =>
          this.getPeriodLabel(i.payrollPeriodId).toLowerCase().includes(q) ||
          i.status?.toLowerCase().includes(q)
        )
      : [...this.items];
    
    this.cdr.markForCheck();
  }

  onSearch() { 
    this.applySearch(); 
  }

  getPeriodLabel(id: string): string {
    const p = this.periods.find(p => p.id === id);
    return p ? `${p.month}/${p.year}` : id;
  }

  openCreate() {
    this.form = { 
      payrollPeriodId: '', 
      status: 'DRAFT', 
      runNumber: 1, 
      notes: '' 
    };
    this.editing = false; 
    this.editingId = ''; 
    this.error = '';
    this.showModal = true;
  }

  openEdit(item: any) {
    this.form = {
      payrollPeriodId: item.payrollPeriodId,
      status: item.status,
      runNumber: item.runNumber ?? 1,
      notes: item.notes ?? ''
    };
    this.editing = true; 
    this.editingId = item.id; 
    this.error = '';
    this.showModal = true;
  }

  save() {
    // ✅ Validation
    if (!this.form.payrollPeriodId) { 
      this.error = 'La période de paie est obligatoire.'; 
      return; 
    }

    // ✅⭐⭐⭐ SOLUTION 2 : Récupérer le companyId depuis la période sélectionnée ⭐⭐⭐
    const selectedPeriod = this.periods.find(p => p.id === this.form.payrollPeriodId);
    
    if (!selectedPeriod) {
      this.error = 'Période de paie invalide.';
      return;
    }

    if (!selectedPeriod.companyId) {
      this.error = 'Cette période n\'est pas associée à une entreprise.';
      return;
    }

    // ✅ Utiliser le companyId de la période
    const companyId = selectedPeriod.companyId;
    
    console.log('✅ CompanyId récupéré depuis la période:', companyId);
    console.log('📅 Période sélectionnée:', selectedPeriod);

    const payload: any = {
      companyId: companyId,  // ✅ Garanti non-null !
      payrollPeriodId: this.form.payrollPeriodId,
      status: this.form.status,
      runNumber: +this.form.runNumber || 1,
    };
    
    if (this.form.notes) payload.notes = this.form.notes;

    console.log('📦 Payload envoyé:', payload);

    const obs = this.editing
      ? this.service.update(this.editingId, payload)
      : this.service.create(payload);
      
    obs.subscribe({
      next: () => { 
        this.ngZone.run(() => {
          this.showModal = false; 
          this.load(); 
        });
      },
      error: (e) => { 
        this.ngZone.run(() => {
          console.error('❌ Erreur sauvegarde:', e);
          this.error = e?.error?.error || 'Erreur serveur'; 
          this.cdr.detectChanges();
        });
      }
    });
  }

  delete(id: string) {
    if (!confirm('Supprimer cette exécution ?')) return;
    this.service.delete(id).subscribe(() => {
      this.ngZone.run(() => this.load());
    });
  }

  close() { 
    this.showModal = false; 
    this.cdr.detectChanges();
  }

  statusClass(s: string): string {
    const m: any = { 
      DRAFT: 'badge-secondary', 
      PROCESSING: 'badge-warning', 
      COMPLETED: 'badge-success', 
      CANCELLED: 'badge-danger' 
    };
    return m[s] ?? 'badge-secondary';
  }
}