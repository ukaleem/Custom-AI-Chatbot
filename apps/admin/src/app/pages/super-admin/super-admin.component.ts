import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  adminEmail: string;
  plan: string;
  planName: string;
  isActive: boolean;
  mrr: number;
  usage: { sessionsThisMonth: number; sessionLimit: number; totalAllTime: number; messagesThisMonth: number; resetDate: string };
}

type ActiveTab = 'tenants' | 'password';

const SESSION_KEY = 'super_admin_jwt';

@Component({
  selector: 'app-super-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    .sa-login { min-height: 60vh; display: flex; align-items: center; justify-content: center; }
    .sa-login-card { background: #fff; border-radius: 12px; padding: 40px; width: 100%; max-width: 400px; box-shadow: 0 4px 24px rgba(0,0,0,.1); }
    .sa-logo { font-size: 22px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
    .sa-logo span { color: #e11d48; }
    .sa-sub { color: var(--text-muted); font-size: 13px; margin-bottom: 28px; }
    .mrr-total { font-size: 28px; font-weight: 700; color: #e11d48; }
    .bar { height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; display: inline-block; width: 80px; vertical-align: middle; margin-left: 6px; }
    .bar-fill { height: 100%; background: var(--primary); border-radius: 3px; }
    .bar-fill.danger { background: var(--danger); }
    .tab-bar { display: flex; gap: 4px; margin-bottom: 20px; border-bottom: 1px solid var(--border); }
    .tab { padding: 10px 18px; font-size: 14px; font-weight: 500; color: var(--text-muted); cursor: pointer; border-bottom: 2px solid transparent; background: none; border-top: none; border-left: none; border-right: none; transition: all .15s; }
    .tab.active { color: var(--primary); border-bottom-color: var(--primary); }
    .tab:hover:not(.active) { color: var(--text); }
    .topbar-sa { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
    .admin-badge { background: #fef2f2; color: #e11d48; border: 1px solid #fca5a5; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .pw-strength { height: 4px; border-radius: 2px; margin-top: 6px; transition: background .3s, width .3s; }
  `],
  template: `
    @if (!session()) {
      <!-- ─── LOGIN ──────────────────────────────────────────────────────── -->
      <div class="sa-login">
        <div class="sa-login-card">
          <div class="sa-logo">Super <span>Admin</span></div>
          <div class="sa-sub">Sign in to manage all tenants</div>

          @if (loginError()) {
            <div style="background:#fee2e2;color:#dc2626;padding:10px 14px;border-radius:6px;margin-bottom:16px;font-size:13px">
              {{ loginError() }}
            </div>
          }

          <form (ngSubmit)="login()">
            <div class="form-group">
              <label class="form-label">Email</label>
              <input class="form-control" type="email" [(ngModel)]="loginEmail"
                name="email" placeholder="ukaleem540@gmail.com" autocomplete="username" required />
            </div>
            <div class="form-group">
              <label class="form-label">Password</label>
              <input class="form-control" type="password" [(ngModel)]="loginPassword"
                name="password" placeholder="••••••••" autocomplete="current-password" required />
            </div>
            <button type="submit" class="btn btn-primary"
              style="width:100%;justify-content:center;margin-top:4px"
              [disabled]="loginLoading()">
              {{ loginLoading() ? 'Signing in…' : 'Sign in' }}
            </button>
          </form>
        </div>
      </div>

    } @else {
      <!-- ─── DASHBOARD ──────────────────────────────────────────────────── -->
      <div class="topbar-sa">
        <div>
          <h1 class="page-title" style="margin:0">Super Admin Portal</h1>
          <div style="font-size:13px;color:var(--text-muted);margin-top:2px">{{ session()!.email }}</div>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <span class="admin-badge">⚡ Super Admin</span>
          <button class="btn btn-outline btn-sm" (click)="logout()">Sign out</button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tab-bar">
        <button class="tab" [class.active]="tab()==='tenants'" (click)="tab.set('tenants')">All Tenants</button>
        <button class="tab" [class.active]="tab()==='password'" (click)="tab.set('password')">Change Password</button>
      </div>

      @if (tab() === 'tenants') {
        <!-- Stats grid -->
        @if (loading()) {
          <div class="loading"><div class="spinner"></div></div>
        } @else {
          <div class="stat-grid" style="margin-bottom:20px">
            <div class="stat-card">
              <div class="stat-label">Total Tenants</div>
              <div class="stat-value">{{ tenants().length }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Active</div>
              <div class="stat-value">{{ activeTenants() }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Est. MRR</div>
              <div class="mrr-total">\${{ totalMrr() | number }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">All-time Sessions</div>
              <div class="stat-value">{{ totalSessions() | number }}</div>
            </div>
          </div>

          <!-- Plan breakdown -->
          <div class="card" style="margin-bottom:20px;max-width:480px">
            <div class="card-title">Plan Breakdown</div>
            @for (p of planBreakdown(); track p.plan) {
              <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
                <span style="font-weight:500">{{ p.plan }}</span>
                <div>
                  <span class="badge badge-blue" style="margin-right:8px">{{ p.count }} tenants</span>
                  <span style="color:var(--text-muted);font-size:12px">\${{ p.mrr }}/mo each</span>
                </div>
              </div>
            }
          </div>

          <!-- Tenants table -->
          <div class="card" style="padding:0;overflow:hidden">
            <div style="padding:14px 16px;border-bottom:1px solid var(--border);font-weight:600;font-size:14px">
              {{ tenants().length }} Tenants
            </div>
            <div style="overflow-x:auto">
              <table>
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Sessions (month)</th>
                    <th>Messages</th>
                    <th>All-Time</th>
                    <th>MRR</th>
                  </tr>
                </thead>
                <tbody>
                  @for (t of tenants(); track t.id) {
                    <tr>
                      <td>
                        <div style="font-weight:500">{{ t.name }}</div>
                        <div style="font-size:11px;color:var(--text-muted);font-family:monospace">{{ t.slug }}</div>
                        <div style="font-size:11px;color:var(--text-muted)">{{ t.adminEmail }}</div>
                      </td>
                      <td><span class="badge badge-blue">{{ t.planName }}</span></td>
                      <td>
                        <span class="badge" [class]="t.isActive ? 'badge-green' : 'badge-gray'">
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
                              [style.width]="pct(t) + '%'">
                            </span>
                          </span>
                        }
                      </td>
                      <td style="color:var(--text-muted)">{{ t.usage.messagesThisMonth | number }}</td>
                      <td style="color:var(--text-muted)">{{ t.usage.totalAllTime | number }}</td>
                      <td style="font-weight:600;color:#16a34a">\${{ t.mrr }}/mo</td>
                    </tr>
                  }
                </tbody>
              </table>
              @if (!tenants().length) {
                <div class="empty-state"><h3>No tenants yet</h3><p>Create your first tenant via POST /api/v1/tenants.</p></div>
              }
            </div>
          </div>
        }
      }

      @if (tab() === 'password') {
        <!-- Change password form -->
        <div style="max-width:460px">
          <div class="card">
            <div class="card-title">Change Password</div>
            <p style="font-size:13px;color:var(--text-muted);margin-bottom:20px">
              You are signed in as <strong>{{ session()!.email }}</strong>.
            </p>

            @if (pwSuccess()) {
              <div style="background:#f0fdf4;border:1px solid #86efac;padding:12px 16px;border-radius:8px;margin-bottom:16px;font-size:13px;color:#15803d">
                ✓ Password updated successfully. Use the new password next time you sign in.
              </div>
            }

            @if (pwError()) {
              <div style="background:#fee2e2;color:#dc2626;padding:10px 14px;border-radius:6px;margin-bottom:16px;font-size:13px">
                {{ pwError() }}
              </div>
            }

            <form (ngSubmit)="changePassword()">
              <div class="form-group">
                <label class="form-label">Current Password</label>
                <input class="form-control" type="password" [(ngModel)]="pwCurrent"
                  name="pwCurrent" placeholder="Your current password" autocomplete="current-password" required />
              </div>
              <div class="form-group">
                <label class="form-label">New Password</label>
                <input class="form-control" type="password" [(ngModel)]="pwNew"
                  name="pwNew" placeholder="At least 8 characters" autocomplete="new-password"
                  required minlength="8" (input)="checkStrength()" />
                <div class="pw-strength" [style.background]="pwStrengthColor()" [style.width]="pwStrengthWidth()"></div>
                <small style="font-size:12px;color:var(--text-muted);margin-top:4px;display:block">{{ pwStrengthLabel() }}</small>
              </div>
              <div class="form-group">
                <label class="form-label">Confirm New Password</label>
                <input class="form-control" type="password" [(ngModel)]="pwConfirm"
                  name="pwConfirm" placeholder="Repeat new password" autocomplete="new-password" required />
              </div>
              <button type="submit" class="btn btn-primary"
                [disabled]="pwSaving() || pwNew !== pwConfirm || pwNew.length < 8">
                {{ pwSaving() ? 'Updating…' : 'Update Password' }}
              </button>
              @if (pwNew && pwConfirm && pwNew !== pwConfirm) {
                <div style="color:var(--danger);font-size:12px;margin-top:8px">Passwords do not match.</div>
              }
            </form>
          </div>
        </div>
      }
    }
  `,
})
export class SuperAdminComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  // Auth state
  session = signal<{ token: string; email: string; name: string } | null>(null);
  loginEmail = '';
  loginPassword = '';
  loginLoading = signal(false);
  loginError = signal('');

  // View state
  tab = signal<ActiveTab>('tenants');
  loading = signal(false);
  tenants = signal<TenantRow[]>([]);

  // Password change
  pwCurrent = '';
  pwNew = '';
  pwConfirm = '';
  pwSaving = signal(false);
  pwError = signal('');
  pwSuccess = signal(false);
  private pwStrength = signal(0);

  ngOnInit() {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.session.set(parsed);
        this.loadTenants();
      } catch {
        sessionStorage.removeItem(SESSION_KEY);
      }
    }
  }

  async login() {
    if (!this.loginEmail || !this.loginPassword) return;
    this.loginLoading.set(true);
    this.loginError.set('');
    try {
      const res = await firstValueFrom(
        this.http.post<{ accessToken: string; email: string; name: string }>(
          `${this.base}/super-admin/login`,
          { email: this.loginEmail, password: this.loginPassword },
        ),
      );
      const sess = { token: res.accessToken, email: res.email, name: res.name };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(sess));
      this.session.set(sess);
      this.loginPassword = '';
      this.loadTenants();
    } catch (e: any) {
      this.loginError.set(e?.error?.message ?? 'Invalid email or password');
    } finally {
      this.loginLoading.set(false);
    }
  }

  logout() {
    sessionStorage.removeItem(SESSION_KEY);
    this.session.set(null);
    this.tenants.set([]);
    this.loginEmail = '';
  }

  loadTenants() {
    const token = this.session()?.token;
    if (!token) return;
    this.loading.set(true);
    this.http.get<TenantRow[]>(`${this.base}/super-admin/tenants`, {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
    }).subscribe({
      next: (t) => { this.tenants.set(t); this.loading.set(false); },
      error: () => { this.logout(); this.loading.set(false); },
    });
  }

  async changePassword() {
    if (this.pwNew !== this.pwConfirm || this.pwNew.length < 8) return;
    this.pwSaving.set(true);
    this.pwError.set('');
    this.pwSuccess.set(false);
    try {
      await firstValueFrom(
        this.http.put(
          `${this.base}/super-admin/password`,
          { currentPassword: this.pwCurrent, newPassword: this.pwNew },
          { headers: new HttpHeaders({ Authorization: `Bearer ${this.session()!.token}` }) },
        ),
      );
      this.pwSuccess.set(true);
      this.pwCurrent = '';
      this.pwNew = '';
      this.pwConfirm = '';
      this.pwStrength.set(0);
    } catch (e: any) {
      this.pwError.set(e?.error?.message ?? 'Failed to update password');
    } finally {
      this.pwSaving.set(false);
    }
  }

  checkStrength() {
    const p = this.pwNew;
    let score = 0;
    if (p.length >= 8) score++;
    if (p.length >= 12) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    this.pwStrength.set(score);
  }

  pwStrengthWidth() {
    return `${(this.pwStrength() / 5) * 100}%`;
  }

  pwStrengthColor() {
    const s = this.pwStrength();
    if (s <= 1) return '#ef4444';
    if (s <= 2) return '#f59e0b';
    if (s <= 3) return '#3b82f6';
    return '#22c55e';
  }

  pwStrengthLabel() {
    const s = this.pwStrength();
    if (!this.pwNew) return '';
    if (s <= 1) return 'Weak — add numbers, symbols, uppercase';
    if (s <= 2) return 'Fair';
    if (s <= 3) return 'Good';
    return 'Strong ✓';
  }

  // Computed helpers
  activeTenants() { return this.tenants().filter(t => t.isActive).length; }
  totalMrr() { return this.tenants().filter(t => t.isActive).reduce((s, t) => s + t.mrr, 0); }
  totalSessions() { return this.tenants().reduce((s, t) => s + t.usage.totalAllTime, 0); }
  pct(t: TenantRow) {
    if (t.usage.sessionLimit >= 999999) return 0;
    return Math.min(100, Math.round((t.usage.sessionsThisMonth / t.usage.sessionLimit) * 100));
  }
  planBreakdown() {
    const map: Record<string, { plan: string; count: number; mrr: number }> = {};
    for (const t of this.tenants()) {
      if (!map[t.planName]) map[t.planName] = { plan: t.planName, count: 0, mrr: t.mrr };
      map[t.planName].count++;
    }
    return Object.values(map);
  }
}
