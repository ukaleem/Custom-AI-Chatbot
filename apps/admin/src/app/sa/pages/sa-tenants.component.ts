import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { SaAuthService } from '../sa-auth.service';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

interface TenantRow {
  id: string; name: string; slug: string; adminEmail: string;
  plan: string; planName: string; isActive: boolean; mrr: number; createdAt: string;
  usage: { sessionsThisMonth: number; sessionLimit: number; totalAllTime: number; messagesThisMonth: number };
}

@Component({
  selector: 'app-sa-tenants',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  styles: [`
    .status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 6px; }
    .dot-active { background: #22c55e; }
    .dot-inactive { background: #6b7280; }
    .bar { height: 5px; background: var(--border); border-radius: 3px; overflow: hidden; display: inline-block; width: 70px; vertical-align: middle; margin-left: 6px; }
    .bar-fill { height: 100%; background: var(--primary); border-radius: 3px; }
    .bar-fill.danger { background: var(--danger); }
    .actions-row { display: flex; gap: 6px; align-items: center; }
    .plan-select { padding: 4px 8px; border: 1px solid var(--border); border-radius: 6px; font-size: 12px; background: var(--bg); cursor: pointer; }
  `],
  template: `
    <div class="page-header">
      <h1 class="page-title">All Companies ({{ tenants().length }})</h1>
      <a routerLink="/sa/tenants/new" class="btn btn-primary">+ Register Company</a>
    </div>

    @if (loading()) {
      <div class="loading"><div class="spinner"></div></div>
    } @else {
      <!-- Filters -->
      <div class="card" style="margin-bottom:16px;padding:14px 16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <input class="form-control" style="max-width:220px" placeholder="Search company name or slug…" [(ngModel)]="search" />
        <select class="form-control" style="max-width:140px" [(ngModel)]="filterStatus">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select class="form-control" style="max-width:140px" [(ngModel)]="filterPlan">
          <option value="">All Plans</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
        <span style="font-size:13px;color:var(--text-muted)">{{ filtered().length }} shown</span>
      </div>

      <div class="card" style="padding:0;overflow:hidden">
        <div style="overflow-x:auto">
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Sessions (month)</th>
                <th>All-Time</th>
                <th>MRR</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (t of filtered(); track t.id) {
                <tr>
                  <td>
                    <div style="font-weight:600">{{ t.name }}</div>
                    <div style="font-size:11px;font-family:monospace;color:var(--text-muted)">{{ t.slug }}</div>
                    <div style="font-size:11px;color:var(--text-muted)">{{ t.adminEmail }}</div>
                  </td>
                  <td>
                    <select class="plan-select" [value]="t.plan" (change)="changePlan(t, $event)">
                      <option value="starter">Starter</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </td>
                  <td>
                    <span class="status-dot" [class]="t.isActive ? 'dot-active' : 'dot-inactive'"></span>
                    <span style="font-size:13px">{{ t.isActive ? 'Active' : 'Inactive' }}</span>
                  </td>
                  <td>
                    <span style="font-weight:500">{{ t.usage.sessionsThisMonth | number }}</span>
                    <span style="color:var(--text-muted);font-size:12px"> / {{ t.usage.sessionLimit >= 999999 ? '∞' : (t.usage.sessionLimit | number) }}</span>
                    @if (t.usage.sessionLimit < 999999 && t.usage.sessionLimit > 0) {
                      <span class="bar">
                        <span class="bar-fill" [class.danger]="pct(t) >= 100" [style.width]="pct(t) + '%'"></span>
                      </span>
                    }
                  </td>
                  <td style="color:var(--text-muted)">{{ t.usage.totalAllTime | number }}</td>
                  <td style="font-weight:700;color:#16a34a">\${{ t.mrr }}</td>
                  <td>
                    <div class="actions-row">
                      @if (t.isActive) {
                        <button class="btn btn-danger btn-sm" (click)="toggleStatus(t)" [disabled]="saving()">Deactivate</button>
                      } @else {
                        <button class="btn btn-outline btn-sm" style="color:#16a34a;border-color:#16a34a" (click)="toggleStatus(t)" [disabled]="saving()">Activate</button>
                      }
                      <button class="btn btn-outline btn-sm" (click)="resetUsage(t)" [disabled]="saving()">Reset Usage</button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
          @if (!filtered().length) {
            <div class="empty-state"><h3>No companies found</h3></div>
          }
        </div>
      </div>
    }
  `,
})
export class SaTenantsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(SaAuthService);
  private readonly base = environment.apiUrl;
  loading = signal(true);
  saving = signal(false);
  tenants = signal<TenantRow[]>([]);
  search = '';
  filterStatus = '';
  filterPlan = '';

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.http.get<TenantRow[]>(`${this.base}/super-admin/tenants`, {
      headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.token}` }),
    }).subscribe({ next: t => { this.tenants.set(t); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  filtered() {
    return this.tenants().filter(t => {
      if (this.search && !t.name.toLowerCase().includes(this.search.toLowerCase()) && !t.slug.includes(this.search.toLowerCase())) return false;
      if (this.filterStatus === 'active' && !t.isActive) return false;
      if (this.filterStatus === 'inactive' && t.isActive) return false;
      if (this.filterPlan && t.plan !== this.filterPlan) return false;
      return true;
    });
  }

  pct(t: TenantRow) { return Math.min(100, Math.round((t.usage.sessionsThisMonth / t.usage.sessionLimit) * 100)); }

  async toggleStatus(t: TenantRow) {
    this.saving.set(true);
    try {
      await firstValueFrom(this.http.patch(`${this.base}/super-admin/tenants/${t.id}/status`,
        { isActive: !t.isActive },
        { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.token}` }) }
      ));
      this.tenants.update(list => list.map(x => x.id === t.id ? { ...x, isActive: !x.isActive } : x));
    } finally { this.saving.set(false); }
  }

  async changePlan(t: TenantRow, event: Event) {
    const plan = (event.target as HTMLSelectElement).value;
    this.saving.set(true);
    try {
      await firstValueFrom(this.http.put(`${this.base}/super-admin/tenants/${t.id}/plan`,
        { plan },
        { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.token}` }) }
      ));
      this.tenants.update(list => list.map(x => x.id === t.id ? { ...x, plan } : x));
    } finally { this.saving.set(false); }
  }

  async resetUsage(t: TenantRow) {
    if (!confirm(`Reset monthly usage for "${t.name}"?`)) return;
    this.saving.set(true);
    try {
      await firstValueFrom(this.http.post(`${this.base}/super-admin/tenants/${t.id}/reset-usage`, {},
        { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.token}` }) }
      ));
      this.tenants.update(list => list.map(x => x.id === t.id
        ? { ...x, usage: { ...x.usage, sessionsThisMonth: 0, messagesThisMonth: 0 } } : x));
    } finally { this.saving.set(false); }
  }
}
