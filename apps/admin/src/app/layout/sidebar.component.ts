import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  styles: [`
    :host { display: block; width: var(--sidebar-w); background: #1e293b; color: #cbd5e1; flex-shrink: 0; }
    .logo { padding: 20px 20px 16px; font-size: 16px; font-weight: 700; color: #fff; border-bottom: 1px solid #334155; }
    .logo span { color: #60a5fa; }
    nav { padding: 12px 8px; }
    .nav-section { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; padding: 12px 12px 4px; }
    a { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 6px; color: #94a3b8; font-size: 14px; font-weight: 500; transition: all 0.15s; text-decoration: none; margin-bottom: 2px; }
    a:hover { background: #334155; color: #f1f5f9; }
    a.active { background: #2563eb; color: #fff; }
    .icon { font-size: 16px; width: 20px; text-align: center; }
  `],
  template: `
    <div class="logo">Catania <span>AI Bot</span></div>
    <nav>
      <div class="nav-section">Main</div>
      <a routerLink="/dashboard" routerLinkActive="active">
        <span class="icon">📊</span> Dashboard
      </a>
      <a routerLink="/attractions" routerLinkActive="active">
        <span class="icon">🏛</span> Attractions
      </a>
      <a routerLink="/conversations" routerLinkActive="active">
        <span class="icon">💬</span> Conversations
      </a>
      <div class="nav-section">Settings</div>
      <a routerLink="/settings/bot" routerLinkActive="active">
        <span class="icon">🤖</span> Bot Config
      </a>
      <a routerLink="/settings/llm" routerLinkActive="active">
        <span class="icon">🔑</span> LLM API Key
      </a>
      <a routerLink="/settings/widget" routerLinkActive="active">
        <span class="icon">🔗</span> Embed Widget
      </a>
      <div class="nav-section">Account</div>
      <a routerLink="/billing" routerLinkActive="active">
        <span class="icon">💳</span> Billing & Plan
      </a>
      <a routerLink="/super-admin" routerLinkActive="active">
        <span class="icon">🛡</span> Super Admin
      </a>
    </nav>
  `,
})
export class SidebarComponent {}
