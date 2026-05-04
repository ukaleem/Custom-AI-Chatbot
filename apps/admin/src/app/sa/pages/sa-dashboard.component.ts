import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { SaAuthService } from '../sa-auth.service';
import { environment } from '../../../environments/environment';

interface GlobalAnalytics {
  overview: { totalTenants: number; activeTenants: number; inactiveTenants: number; mrr: number };
  usage: { totalSessionsAllTime: number; messagesThisMonth: number };
  planBreakdown: Record<string, number>;
  topTenantsByUsage: { name: string; slug: string; sessions: number; plan: string }[];
  plans: { key: string; name: string; priceMonthly: number; count: number; revenue: number }[];
}

@Component({
  selector: 'app-sa-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-header">
      <h1 class="page-title">Platform Dashboard</h1>
    </div>

    @if (loading()) {
      <div class="loading"><div class="spinner"></div></div>
    } @else if (data()) {
      <!-- KPI cards -->
      <div class="stat-grid" style="margin-bottom:24px">
        <div class="stat-card">
          <div class="stat-label">Total Companies</div>
          <div class="stat-value">{{ data()!.overview.totalTenants }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Active</div>
          <div class="stat-value" style="color:#16a34a">{{ data()!.overview.activeTenants }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Est. MRR</div>
          <div class="stat-value" style="color:#e11d48">\${{ data()!.overview.mrr | number }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">All-Time Sessions</div>
          <div class="stat-value">{{ data()!.usage.totalSessionsAllTime | number }}</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
        <!-- Plan revenue breakdown -->
        <div class="card">
          <div class="card-title">Revenue by Plan</div>
          @for (p of data()!.plans; track p.key) {
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
              <div>
                <span style="font-weight:600">{{ p.name }}</span>
                <span style="font-size:12px;color:var(--text-muted);margin-left:8px">\${{ p.priceMonthly }}/mo × {{ p.count }}</span>
              </div>
              <div style="font-weight:700;color:#16a34a">\${{ p.revenue | number }}</div>
            </div>
          }
        </div>

        <!-- Top companies by usage -->
        <div class="card">
          <div class="card-title">Top Companies by Sessions</div>
          @for (t of data()!.topTenantsByUsage; track t.slug) {
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
              <div>
                <div style="font-weight:500">{{ t.name }}</div>
                <div style="font-size:11px;color:var(--text-muted);font-family:monospace">{{ t.slug }}</div>
              </div>
              <div style="text-align:right">
                <div style="font-weight:600">{{ t.sessions | number }}</div>
                <span class="badge badge-blue" style="font-size:10px">{{ t.plan }}</span>
              </div>
            </div>
          }
          @if (!data()!.topTenantsByUsage.length) {
            <div style="color:var(--text-muted);font-size:13px;padding:16px 0">No companies yet</div>
          }
        </div>
      </div>

      <!-- Quick actions -->
      <div class="card">
        <div class="card-title">Quick Actions</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <a routerLink="/sa/tenants" class="btn btn-primary">Manage Companies</a>
          <a routerLink="/sa/tenants/new" class="btn btn-outline">Register New Company</a>
          <a routerLink="/sa/analytics" class="btn btn-outline">Full Analytics</a>
        </div>
      </div>
    }
  `,
})
export class SaDashboardComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(SaAuthService);
  private readonly base = environment.apiUrl;
  loading = signal(true);
  data = signal<GlobalAnalytics | null>(null);

  ngOnInit() {
    this.http.get<GlobalAnalytics>(`${this.base}/super-admin/analytics`, {
      headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.token}` }),
    }).subscribe({
      next: d => { this.data.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
