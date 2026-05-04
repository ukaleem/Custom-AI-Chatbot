import { Component, inject, OnInit, signal, AfterViewInit, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface Overview {
  sessions: { total: number; today: number; thisWeek: number; thisMonth: number; active: number };
  languages: { language: string; count: number }[];
  tokens: { totalInputAllTime: number; totalOutputAllTime: number; totalAllTime: number };
  modelBreakdown: { model: string; sessions: number; totalTokens: number }[];
}
interface TokenSummary {
  today:    { inputTokens: number; outputTokens: number; total: number; requests: number };
  thisWeek: { inputTokens: number; outputTokens: number; total: number; requests: number };
  thisMonth:{ inputTokens: number; outputTokens: number; total: number; requests: number };
  allTime:  { inputTokens: number; outputTokens: number; total: number; requests: number };
}
interface DayStats { date: string; sessions: number; totalTokens: number; inputTokens: number; outputTokens: number; }

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  styles: [`
    .metric-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
    .metric-card { background: #fff; border-radius: 12px; padding: 18px 20px; border: 1px solid var(--border); }
    .metric-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); margin-bottom: 6px; }
    .metric-value { font-size: 28px; font-weight: 700; line-height: 1.1; }
    .metric-sub { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
    .metric-trend { font-size: 12px; margin-top: 4px; }
    .charts-row { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; margin-bottom: 16px; }
    .charts-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .chart-card { background: #fff; border-radius: 12px; padding: 18px; border: 1px solid var(--border); }
    .chart-title { font-size: 13px; font-weight: 600; margin-bottom: 14px; color: #1e293b; }
    .chart-container { position: relative; }
    .model-list { margin-top: 4px; }
    .model-row { display: flex; align-items: center; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
    .model-bar-wrap { flex: 1; margin: 0 10px; height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
    .model-bar { height: 100%; border-radius: 3px; background: var(--primary); }
    .token-period { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .token-box { background: var(--bg); border-radius: 8px; padding: 12px; }
    .token-box-label { font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: .05em; }
    .token-box-val { font-size: 18px; font-weight: 700; margin: 2px 0; }
    .token-box-sub { font-size: 11px; color: var(--text-muted); }
    @media (max-width: 900px) { .metric-row { grid-template-columns: repeat(2,1fr); } .charts-row, .charts-row-3 { grid-template-columns: 1fr; } }
  `],
  template: `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <h1 class="page-title" style="margin:0">Dashboard</h1>
      <div style="font-size:12px;color:var(--text-muted)">
        @if (!loading()) { Last updated: {{ now | date:'HH:mm:ss' }} }
      </div>
    </div>

    @if (loading()) {
      <div class="loading"><div class="spinner"></div></div>
    } @else {

      <!-- ── Row 1: Key metrics ── -->
      <div class="metric-row">
        <div class="metric-card">
          <div class="metric-label">Sessions Today</div>
          <div class="metric-value">{{ overview()!.sessions.today | number }}</div>
          <div class="metric-sub">{{ overview()!.sessions.thisWeek | number }} this week</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Sessions This Month</div>
          <div class="metric-value">{{ overview()!.sessions.thisMonth | number }}</div>
          <div class="metric-sub">{{ overview()!.sessions.total | number }} all time</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Tokens Today</div>
          <div class="metric-value" style="color:#7c3aed">{{ (tokens()?.today?.total ?? 0) | number }}</div>
          <div class="metric-sub">↑ {{ (tokens()?.today?.outputTokens ?? 0) | number }} output</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Tokens This Month</div>
          <div class="metric-value" style="color:#7c3aed">{{ (tokens()?.thisMonth?.total ?? 0) | number }}</div>
          <div class="metric-sub">{{ (tokens()?.allTime?.total ?? 0) | number }} all time</div>
        </div>
      </div>

      <!-- ── Row 2: Sessions chart + Language donut ── -->
      <div class="charts-row">
        <div class="chart-card">
          <div class="chart-title">Daily Sessions — Last 30 Days</div>
          <div class="chart-container" style="height:220px">
            <canvas #sessionsChart></canvas>
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-title">Sessions by Language</div>
          <div class="chart-container" style="height:220px">
            <canvas #langChart></canvas>
          </div>
        </div>
      </div>

      <!-- ── Row 3: Token chart (input vs output) + Model usage ── -->
      <div class="charts-row">
        <div class="chart-card">
          <div class="chart-title">Daily Token Usage — Last 14 Days (Input vs Output)</div>
          <div class="chart-container" style="height:220px">
            <canvas #tokenChart></canvas>
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-title">AI Model Usage</div>
          @if (overview()!.modelBreakdown.length) {
            <div class="model-list">
              @for (m of overview()!.modelBreakdown; track m.model) {
                <div class="model-row">
                  <span style="max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px">{{ m.model }}</span>
                  <div class="model-bar-wrap">
                    <div class="model-bar" [style.width]="modelPct(m) + '%'"></div>
                  </div>
                  <span style="white-space:nowrap;font-size:12px;color:var(--text-muted)">{{ m.sessions }} sess</span>
                </div>
              }
            </div>
            <div class="chart-container" style="height:140px;margin-top:12px">
              <canvas #modelChart></canvas>
            </div>
          } @else {
            <div class="empty-state" style="padding:32px 16px">
              <h3>No AI model data yet</h3>
              <p>Set an LLM API key and start chats to see model usage.</p>
            </div>
          }
        </div>
      </div>

      <!-- ── Row 4: Token period breakdown ── -->
      <div class="charts-row-3">
        <div class="chart-card">
          <div class="chart-title">Token Usage — Today</div>
          <div class="token-period">
            <div class="token-box">
              <div class="token-box-label">Input</div>
              <div class="token-box-val" style="color:#3b82f6">{{ (tokens()?.today?.inputTokens ?? 0) | number }}</div>
              <div class="token-box-sub">prompt tokens</div>
            </div>
            <div class="token-box">
              <div class="token-box-label">Output</div>
              <div class="token-box-val" style="color:#8b5cf6">{{ (tokens()?.today?.outputTokens ?? 0) | number }}</div>
              <div class="token-box-sub">completion tokens</div>
            </div>
          </div>
          <div style="margin-top:10px;font-size:13px;color:var(--text-muted)">
            {{ tokens()?.today?.requests ?? 0 }} sessions · {{ (tokens()?.today?.total ?? 0) | number }} total tokens
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-title">Token Usage — This Week</div>
          <div class="token-period">
            <div class="token-box">
              <div class="token-box-label">Input</div>
              <div class="token-box-val" style="color:#3b82f6">{{ (tokens()?.thisWeek?.inputTokens ?? 0) | number }}</div>
              <div class="token-box-sub">prompt tokens</div>
            </div>
            <div class="token-box">
              <div class="token-box-label">Output</div>
              <div class="token-box-val" style="color:#8b5cf6">{{ (tokens()?.thisWeek?.outputTokens ?? 0) | number }}</div>
              <div class="token-box-sub">completion tokens</div>
            </div>
          </div>
          <div style="margin-top:10px;font-size:13px;color:var(--text-muted)">
            {{ tokens()?.thisWeek?.requests ?? 0 }} sessions · {{ (tokens()?.thisWeek?.total ?? 0) | number }} total tokens
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-title">Token Usage — This Month</div>
          <div class="token-period">
            <div class="token-box">
              <div class="token-box-label">Input</div>
              <div class="token-box-val" style="color:#3b82f6">{{ (tokens()?.thisMonth?.inputTokens ?? 0) | number }}</div>
              <div class="token-box-sub">prompt tokens</div>
            </div>
            <div class="token-box">
              <div class="token-box-label">Output</div>
              <div class="token-box-val" style="color:#8b5cf6">{{ (tokens()?.thisMonth?.outputTokens ?? 0) | number }}</div>
              <div class="token-box-sub">completion tokens</div>
            </div>
          </div>
          <div style="margin-top:10px;font-size:13px;color:var(--text-muted)">
            {{ tokens()?.thisMonth?.requests ?? 0 }} sessions · {{ (tokens()?.thisMonth?.total ?? 0) | number }} total tokens
          </div>
        </div>
      </div>
    }
  `,
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly api = inject(ApiService);

  @ViewChild('sessionsChart') sessionsChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('langChart')     langChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('tokenChart')    tokenChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('modelChart')    modelChartRef!: ElementRef<HTMLCanvasElement>;

  loading = signal(true);
  overview = signal<Overview | null>(null);
  tokens   = signal<TokenSummary | null>(null);
  daily    = signal<DayStats[]>([]);
  now = new Date();

  private charts: Chart[] = [];

  ngOnInit() {
    Promise.all([
      this.api.get<Overview>('analytics/overview').toPromise(),
      this.api.get<TokenSummary>('analytics/tokens').toPromise(),
      this.api.get<DayStats[]>('analytics/daily', { days: 30 }).toPromise(),
    ]).then(([ov, tok, day]) => {
      this.overview.set(ov ?? null);
      this.tokens.set(tok ?? null);
      this.daily.set(day ?? []);
      this.loading.set(false);
      // give Angular one tick to render canvases
      setTimeout(() => this.buildCharts(), 50);
    }).catch(() => this.loading.set(false));
  }

  ngAfterViewInit() {}

  ngOnDestroy() { this.charts.forEach(c => c.destroy()); }

  modelPct(m: { totalTokens: number }) {
    const max = Math.max(...(this.overview()?.modelBreakdown.map(x => x.totalTokens) ?? [1]));
    return max ? Math.round((m.totalTokens / max) * 100) : 0;
  }

  private buildCharts() {
    const daily = this.daily();
    const COLORS = { blue: '#3b82f6', purple: '#8b5cf6', green: '#22c55e', orange: '#f59e0b', red: '#ef4444' };

    // ── Sessions line chart ──────────────────────────────────────────────────
    if (this.sessionsChartRef?.nativeElement) {
      const ch = new Chart(this.sessionsChartRef.nativeElement, {
        type: 'line',
        data: {
          labels: daily.map(d => d.date.slice(5)),
          datasets: [{
            label: 'Sessions',
            data: daily.map(d => d.sessions),
            borderColor: COLORS.blue,
            backgroundColor: 'rgba(59,130,246,0.1)',
            fill: true, tension: 0.4, pointRadius: 3,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 45 } },
            y: { beginAtZero: true, ticks: { font: { size: 11 } } },
          },
        },
      });
      this.charts.push(ch);
    }

    // ── Language donut ───────────────────────────────────────────────────────
    if (this.langChartRef?.nativeElement) {
      const langs = this.overview()?.languages ?? [];
      const LANG_COLORS = ['#3b82f6','#8b5cf6','#22c55e','#f59e0b','#ef4444','#06b6d4'];
      const ch = new Chart(this.langChartRef.nativeElement, {
        type: 'doughnut',
        data: {
          labels: langs.map(l => l.language.toUpperCase()),
          datasets: [{ data: langs.map(l => l.count), backgroundColor: LANG_COLORS, borderWidth: 2 }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 10 } } },
        },
      });
      this.charts.push(ch);
    }

    // ── Token stacked bar (last 14 days) ─────────────────────────────────────
    if (this.tokenChartRef?.nativeElement) {
      const slice14 = daily.slice(-14);
      const ch = new Chart(this.tokenChartRef.nativeElement, {
        type: 'bar',
        data: {
          labels: slice14.map(d => d.date.slice(5)),
          datasets: [
            { label: 'Input tokens',  data: slice14.map(d => d.inputTokens),  backgroundColor: 'rgba(59,130,246,0.75)',  stack: 'tokens' },
            { label: 'Output tokens', data: slice14.map(d => d.outputTokens), backgroundColor: 'rgba(139,92,246,0.75)', stack: 'tokens' },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } },
          scales: {
            x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 45 } },
            y: { stacked: true, beginAtZero: true, ticks: { font: { size: 11 } } },
          },
        },
      });
      this.charts.push(ch);
    }

    // ── Model donut ──────────────────────────────────────────────────────────
    const models = this.overview()?.modelBreakdown ?? [];
    if (this.modelChartRef?.nativeElement && models.length) {
      const ch = new Chart(this.modelChartRef.nativeElement, {
        type: 'doughnut',
        data: {
          labels: models.map(m => m.model),
          datasets: [{ data: models.map(m => m.totalTokens), backgroundColor: ['#3b82f6','#8b5cf6','#22c55e','#f59e0b'], borderWidth: 2 }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
        },
      });
      this.charts.push(ch);
    }
  }
}
