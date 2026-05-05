import { CommonModule }                         from '@angular/common';
import {
  Component,
  Input,
  computed,
  signal,
  ViewEncapsulation,
  HostListener,
  ElementRef,
  AfterViewInit,
  ChangeDetectorRef,
}                                                from '@angular/core';
import { NgxChartsModule, Color, ScaleType }     from '@swimlane/ngx-charts';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ChartDatum {
  label   : string;
  value   : number;
  color?  : string;
  helper? : string;
}

// ── Palette interne ──────────────────────────────────────────────────────────

interface ColorMeta { hex: string; bg: string; text: string; }

const COLOR_PALETTE: ColorMeta[] = [
  { hex: '#3b82f6', bg: '#eff6ff', text: '#1d4ed8' },
  { hex: '#10b981', bg: '#ecfdf5', text: '#047857' },
  { hex: '#f59e0b', bg: '#fffbeb', text: '#b45309' },
  { hex: '#ef4444', bg: '#fef2f2', text: '#b91c1c' },
  { hex: '#8b5cf6', bg: '#f5f3ff', text: '#6d28d9' },
  { hex: '#f97316', bg: '#fff7ed', text: '#c2410c' },
  { hex: '#14b8a6', bg: '#f0fdfa', text: '#0f766e' },
  { hex: '#ec4899', bg: '#fdf2f8', text: '#be185d' },
  { hex: '#06b6d4', bg: '#ecfeff', text: '#0e7490' },
  { hex: '#6366f1', bg: '#eef2ff', text: '#4338ca' },
];

function resolveColor(hex: string | undefined, index: number): ColorMeta {
  if (hex) {
    const found = COLOR_PALETTE.find(c => c.hex.toLowerCase() === hex.toLowerCase());
    return found ?? { hex: hex, bg: '#f8fafc', text: '#475569' };
  }
  return COLOR_PALETTE[index % COLOR_PALETTE.length];
}

// ── Composant ────────────────────────────────────────────────────────────────

@Component({
  selector    : 'app-ui-chart',
  standalone  : true,
  imports     : [CommonModule, NgxChartsModule],
  templateUrl : './ui-chart.component.html',
  styleUrls   : ['./ui-chart.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class UiChartComponent implements AfterViewInit {

  // ── Inputs ────────────────────────────────────────────────────────────────

  @Input() type       : 'donut' | 'bar' = 'donut';
  @Input() title      : string = '';
  @Input() subtitle   : string = '';
  @Input() centerLabel: string = '';
  @Input() emptyLabel : string = 'Les données apparaîtront ici une fois disponibles.';

  @Input() set data(value: ChartDatum[] | null | undefined) {
    this.dataSignal.set((value ?? []).filter(item => item.value > 0));
  }

  // ── State ─────────────────────────────────────────────────────────────────

  private readonly dataSignal = signal<ChartDatum[]>([]);
  readonly chartData = this.dataSignal.asReadonly();

  /**
   * FIX SIZING : ngx-charts accepte un Input [view]="[width, height]"
   * qui bypasse son propre ResizeSensor (souvent buggé).
   * On calcule ces dimensions à partir de la taille réelle du wrapper DOM.
   */
  chartView: [number, number] = [300, 220];

  constructor(
    private el : ElementRef,
    private cdr: ChangeDetectorRef,
  ) {}

  ngAfterViewInit(): void {
    this.updateChartView();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateChartView();
  }

  private updateChartView(): void {
    const wrapper = this.el.nativeElement.querySelector('.chart-wrapper') as HTMLElement;
    if (!wrapper) return;
    const w = wrapper.clientWidth  || 300;
    const h = wrapper.clientHeight || 220;
    this.chartView = [w, h];
    this.cdr.detectChanges();
  }

  // ── Color scheme ──────────────────────────────────────────────────────────

  readonly colorScheme: Color = {
    name      : 'hrmatrix-pro',
    selectable: true,
    group     : ScaleType.Ordinal,
    domain    : COLOR_PALETTE.map(c => c.hex),
  };

  readonly customColors = computed(() =>
    this.chartData()
      .filter(d => !!d.color)
      .map(d => ({ name: d.label, value: d.color! }))
  );

  // ── Computed ──────────────────────────────────────────────────────────────

  readonly total = computed(() =>
    this.dataSignal().reduce((sum, item) => sum + item.value, 0)
  );

  readonly hasData = computed(() => this.total() > 0);

  readonly chartResults = computed(() =>
    this.chartData().map(item => ({ name: item.label, value: item.value }))
  );

  readonly advancedPieResults = computed(() => {
    const total = this.total();
    return this.chartData().map(item => ({
      name : item.label,
      value: item.value,
      extra: { percent: total ? Math.round((item.value / total) * 100) : 0 },
    }));
  });

  // ── FIX yAxis décimales ───────────────────────────────────────────────────
  // ngx-charts affiche des décimales quand les valeurs sont petites.
  // yAxisTickFormatting force l'affichage d'entiers uniquement.

  readonly yAxisTickFormatting = (value: number): string => {
    if (!Number.isInteger(value)) return '';   // supprime les ticks décimaux
    return value.toLocaleString('fr-FR');
  };

  // ── yScaleMax : évite que la seule barre remplisse toute la hauteur ───────
  // On ajoute 20% au-dessus de la valeur max pour avoir du headroom visuel.

  readonly yScaleMax = computed((): number => {
    const max = Math.max(...this.chartData().map(d => d.value), 0);
    return Math.ceil(max * 1.25);
  });

  // ── Méthodes publiques ────────────────────────────────────────────────────

  getPercent(value: number): number {
    const total = this.total();
    return total ? Math.round((value / total) * 100) : 0;
  }

  getPctBg(hex: string | undefined): string {
    const index = this.chartData().findIndex(d => d.color === hex);
    return resolveColor(hex, index >= 0 ? index : 0).bg;
  }

  getPctColor(hex: string | undefined): string {
    const index = this.chartData().findIndex(d => d.color === hex);
    return resolveColor(hex, index >= 0 ? index : 0).text;
  }

  trackByLabel(_index: number, item: ChartDatum): string {
    return item.label;
  }

  onSelect(_event: unknown): void {}
}