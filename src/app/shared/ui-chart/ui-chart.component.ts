import { CommonModule } from '@angular/common';
import { Component, Input, computed, signal } from '@angular/core';
import { NgxChartsModule, Color, ScaleType } from '@swimlane/ngx-charts';

export interface ChartDatum {
  label: string;
  value: number;
  color?: string;
  helper?: string;
}

@Component({
  selector: 'app-ui-chart',
  standalone: true,
  imports: [CommonModule, NgxChartsModule],
  templateUrl: './ui-chart.component.html',
  styleUrls: ['./ui-chart.component.scss'],
})
export class UiChartComponent {
  private readonly dataSignal = signal<ChartDatum[]>([]);
  readonly chartData = this.dataSignal.asReadonly();

  @Input() type: 'donut' | 'bar' = 'donut';
  @Input() title = '';
  @Input() subtitle = '';
  @Input() centerLabel = '';
  @Input() emptyLabel = 'Aucune donnée';

  // ✅ Correction: utiliser le type Color correct
  colorScheme: Color = {
    name: 'vibrant',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6']
  };

  @Input() set data(value: ChartDatum[] | null | undefined) {
    this.dataSignal.set((value ?? []).filter((item) => item.value > 0));
  }

  readonly total = computed(() =>
    this.dataSignal().reduce((sum, item) => sum + item.value, 0)
  );

  readonly hasData = computed(() => this.total() > 0);

  readonly chartResults = computed(() => {
    return this.chartData().map(item => ({
      name: item.label,
      value: item.value,
    }));
  });

  readonly advancedPieResults = computed(() => {
    const total = this.total();
    return this.chartData().map(item => ({
      name: item.label,
      value: item.value,
      extra: {
        percent: total ? Math.round((item.value / total) * 100) : 0,
      }
    }));
  });

  onSelect(event: any): void {
    console.log('Chart element selected:', event);
  }

  getPercent(value: number): number {
    const total = this.total();
    return total ? Math.round((value / total) * 100) : 0;
  }
}