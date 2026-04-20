import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent],
  styles: [`
    .shell { display: flex; min-height: 100vh; }
    .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .topbar { height: 56px; border-bottom: 1px solid var(--border); background: #fff; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; }
    .topbar-title { font-weight: 600; font-size: 15px; }
    .tenant-name { font-size: 13px; color: var(--text-muted); }
    .content { flex: 1; padding: 24px; overflow-y: auto; }
    .logout-btn { background: none; border: none; font-size: 13px; color: var(--text-muted); cursor: pointer; padding: 4px 8px; border-radius: 4px; }
    .logout-btn:hover { background: var(--bg); color: var(--danger); }
  `],
  template: `
    <div class="shell">
      <app-sidebar />
      <div class="main">
        <div class="topbar">
          <span class="tenant-name">{{ auth.session()?.tenant?.name }}</span>
          <button class="logout-btn" (click)="auth.logout()">Sign out</button>
        </div>
        <div class="content">
          <router-outlet />
        </div>
      </div>
    </div>
  `,
})
export class LayoutComponent {
  readonly auth = inject(AuthService);
}
