import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  planName: string;
  isActive: boolean;
  mrr: number;
  usage: { sessionsThisMonth: number; sessionLimit: number; totalAllTime: number };
}

@Component({
  selector: 'app-super-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    .mrr-total { font-size: 28px; font-weight: 700; color: var(--primary); }
    .tenant-row:hover { background: var(--bg); }
    .bar { height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; display: inline-block; width: 80px; vertical-align: middle; margin-left: 6px; }
    .bar-fill { height: 100%; background: var(--primary); border-radius: 3px; }
    .bar-fill.danger { background: var(--danger); }
  `],
  template: `
    <div class="page-header">
      <h1 class="page-title">Super Admin — All Tenants</h1>
    </div>

    @if (!adminKey()) {
      <div class="card" style="max-width:480px">
        <div class="card-title">Enter Super Admin Key</div>
        <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">
          This panel requires the <code>x-admin-key</code> to view all tenants.
        </p>
        <div style="display:flex;gap:8px">
          <input class="form-control" type="password" [(ngModel)]="keyInput"
            placeholder="Your SUPER_ADMIN_KEY from .env" (keyup.enter)="applyKey()" />
          <button class="btn btn-primary" (click)="applyKey()">View Tenants</button>
        </div>
      </div>
    } @else {
      @if (loading()) {
        <div class="loading"><div class="spinner"></div></div>
      } @else {
        <!-- MRR summary -->
        <div class="stat-grid" style="margin-bottom:20px">
          <div class="stat-card">
            <div class="stat-label">Total Tenants</div>
            <div class="stat-value">{{ tenants().length }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Active Tenants</div>
            <div class="stat-value">{{ activeTenants() }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">MRR (est.)</div>
            <div class="mrr-total">\${{ totalMrr() | number }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Sessions (all time)</div>
            <div class="stat-value">{{ totalSessions() | number }}</div>
          </div>
        </div>

        <!-- Plan breakdown -->
        <div class="card" style="margin-bottom:20px;max-width:500px">
          <div class="card-title">Plan Breakdown</div>
          @for (p of planBreakdown(); track p.plan) {
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
              <span style="font-weight:500">{{ p.plan }}</span>
              <div>
                <span class="badge badge-blue">{{ p.count }}</span>
                <span style="margin-left:8px;color:var(--text-muted);font-size:12px">\${{ p.mrr }}/mo each</span>
              </div>
            </div>
          }
        </div>

        <!-- Tenants table -->
        <div class="card" style="padding:0;overflow:hidden">
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Sessions (month)</th>
                <th>All-Time</th>
                <th>MRR</th>
              </tr>
            </thead>
            <tbody>
              @for (t of tenants(); track t.id) {
                <tr class="tenant-row">
                  <td>
                    <div style="font-weight:500">{{ t.name }}</div>
                    <div style="font-size:11px;font-family:monospace;color:var(--text-muted)">{{ t.slug }}</div>
                  </td>
                  <td><span class="badge badge-blue">{{ t.planName }}</span></td>
                  <td>
                    <span class="badge" [class]="t.isActive ? 'badge-green' : 'badge-red'">
                      {{ t.isActive ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                  <td>
                    <span style="font-weight:500">{{ t.usage.sessionsThisMonth | number }}</span>
                    <span style="color:var(--text-muted);font-size:12px"> / {{ t.usage.sessionLimit >= 999999 ? '∞' : (t.usage.sessionLimit | number) }}</span>
                    @if (t.usage.sessionLimit < 999999) {
                      <span class="bar">
                        <span class="bar-fill"
                          [class.danger]="pct(t) >= 100"
                          [style.width]="pct(t) + '%'"></span>
                      </span>
                    }
                  </td>
                  <td style="color:var(--text-muted)">{{ t.usage.totalAllTime | number }}</td>
                  <td style="font-weight:600">\${{ t.mrr }}/mo</td>
                </tr>
              }
            </tbody>
          </table>
          @if (!tenants().length) {
            <div class="empty-state"><h3>No tenants yet</h3></div>
          }
        </div>
      }
    }
  `,
})
export class SuperAdminComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;
  loading = signal(false);
  tenants = signal<TenantRow[]>([]);
  adminKey = signal<string | null>(null);
  keyInput = '';

  ngOnInit() {
    const saved = sessionStorage.getItem('super_admin_key');
    if (saved) { this.adminKey.set(saved); this.loadTenants(saved); }
  }

  applyKey() {
    if (!this.keyInput.trim()) return;
    sessionStorage.setItem('super_admin_key', this.keyInput.trim());
    this.adminKey.set(this.keyInput.trim());
    this.loadTenants(this.keyInput.trim());
  }

  loadTenants(key: string) {
    this.loading.set(true);
    this.http.get<TenantRow[]>(`${this.base}/billing/admin/tenants`, {
      headers: new HttpHeaders({ 'x-admin-key': key }),
    }).subscribe({
      next: (t) => { this.tenants.set(t); this.loading.set(false); },
      error: () => { this.adminKey.set(null); sessionStorage.removeItem('super_admin_key'); this.loading.set(false); },
    });
  }

  activeTenants() { return this.tenants().filter(t => t.isActive).length; }
  totalMrr() { return this.tenants().filter(t => t.isActive).reduce((s, t) => s + t.mrr, 0); }
  totalSessions() { return this.tenants().reduce((s, t) => s + t.usage.totalAllTime, 0); }
  pct(t: TenantRow) { return Math.min(100, Math.round((t.usage.sessionsThisMonth / t.usage.sessionLimit) * 100)); }

  planBreakdown() {
    const map: Record<string, { plan: string; count: number; mrr: number }> = {};
    for (const t of this.tenants()) {
      if (!map[t.planName]) map[t.planName] = { plan: t.planName, count: 0, mrr: t.mrr };
      map[t.planName].count++;
    }
    return Object.values(map);
  }
}
