import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { SaAuthService } from '../sa-auth.service';

@Component({
  selector: 'app-sa-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  styles: [`
    :host { display: flex; min-height: 100vh; }
    .sidebar { width: 220px; background: #0f172a; color: #cbd5e1; flex-shrink: 0; display: flex; flex-direction: column; }
    .logo { padding: 20px 18px 16px; border-bottom: 1px solid #1e293b; }
    .logo-top { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .1em; color: #e11d48; }
    .logo-name { font-size: 17px; font-weight: 700; color: #fff; margin-top: 2px; }
    nav { padding: 12px 8px; flex: 1; }
    .nav-section { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; color: #475569; padding: 12px 10px 4px; }
    a { display: flex; align-items: center; gap: 9px; padding: 9px 10px; border-radius: 6px; color: #94a3b8; font-size: 13.5px; font-weight: 500; text-decoration: none; margin-bottom: 2px; transition: all .15s; }
    a:hover { background: #1e293b; color: #f1f5f9; }
    a.active { background: #e11d48; color: #fff; }
    .icon { font-size: 15px; width: 18px; text-align: center; }
    .footer { padding: 16px; border-top: 1px solid #1e293b; font-size: 12px; color: #64748b; }
    .logout-btn { background: none; border: none; color: #64748b; cursor: pointer; font-size: 12px; margin-top: 6px; padding: 0; display: block; }
    .logout-btn:hover { color: #e11d48; }
    .main { flex: 1; display: flex; flex-direction: column; background: var(--bg, #f8fafc); overflow: hidden; }
    .topbar { height: 52px; background: #fff; border-bottom: 1px solid var(--border, #e2e8f0); display: flex; align-items: center; justify-content: space-between; padding: 0 24px; flex-shrink: 0; }
    .topbar-title { font-size: 14px; font-weight: 600; color: #1e293b; }
    .sa-badge { background: #fef2f2; color: #e11d48; border: 1px solid #fca5a5; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: .03em; }
    .content { flex: 1; padding: 24px; overflow-y: auto; }
  `],
  template: `
    <div class="sidebar">
      <div class="logo">
        <div class="logo-top">Super Admin</div>
        <div class="logo-name">CataniaBot</div>
      </div>
      <nav>
        <div class="nav-section">Overview</div>
        <a routerLink="/sa/dashboard" routerLinkActive="active">
          <span class="icon">📊</span> Dashboard
        </a>
        <a routerLink="/sa/analytics" routerLinkActive="active">
          <span class="icon">📈</span> Global Analytics
        </a>
        <div class="nav-section">Companies</div>
        <a routerLink="/sa/tenants" routerLinkActive="active">
          <span class="icon">🏢</span> All Companies
        </a>
        <a routerLink="/sa/tenants/new" routerLinkActive="active">
          <span class="icon">➕</span> Register Company
        </a>
        <div class="nav-section">Account</div>
        <a routerLink="/sa/settings" routerLinkActive="active">
          <span class="icon">🔒</span> Change Password
        </a>
      </nav>
      <div class="footer">
        <div>{{ auth.session()?.email }}</div>
        <button class="logout-btn" (click)="auth.logout()">Sign out →</button>
      </div>
    </div>

    <div class="main">
      <div class="topbar">
        <span class="topbar-title">Platform Administration</span>
        <span class="sa-badge">⚡ Super Admin — {{ auth.session()?.name }}</span>
      </div>
      <div class="content">
        <router-outlet />
      </div>
    </div>
  `,
})
export class SaLayoutComponent {
  readonly auth = inject(SaAuthService);
}
