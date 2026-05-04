import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SaAuthService } from '../sa-auth.service';

@Component({
  selector: 'app-sa-login',
  standalone: true,
  imports: [FormsModule],
  styles: [`
    :host { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0f172a; }
    .card { background: #1e293b; border-radius: 14px; padding: 40px; width: 100%; max-width: 380px; box-shadow: 0 20px 60px rgba(0,0,0,.5); }
    .logo { font-size: 28px; font-weight: 800; color: #fff; margin-bottom: 4px; }
    .logo span { color: #e11d48; }
    .sub { color: #64748b; font-size: 13px; margin-bottom: 28px; }
    .label { display: block; font-size: 12px; font-weight: 600; color: #94a3b8; margin-bottom: 6px; text-transform: uppercase; letter-spacing: .05em; }
    .input { width: 100%; background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 10px 14px; color: #f1f5f9; font-size: 14px; margin-bottom: 16px; box-sizing: border-box; outline: none; }
    .input:focus { border-color: #e11d48; }
    .btn { width: 100%; padding: 12px; background: #e11d48; border: none; border-radius: 8px; color: #fff; font-size: 15px; font-weight: 700; cursor: pointer; margin-top: 4px; transition: background .15s; }
    .btn:hover:not(:disabled) { background: #be123c; }
    .btn:disabled { opacity: .5; cursor: default; }
    .error { background: rgba(225,29,72,.15); border: 1px solid rgba(225,29,72,.4); color: #fda4af; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }
    .divider { text-align: center; color: #475569; font-size: 12px; margin: 20px 0 12px; }
    .company-link { display: block; text-align: center; color: #64748b; font-size: 12px; text-decoration: none; }
    .company-link:hover { color: #94a3b8; }
  `],
  template: `
    <div class="card">
      <div class="logo">Catania<span>Bot</span></div>
      <div class="sub">Platform Owner Access</div>

      @if (error()) {
        <div class="error">{{ error() }}</div>
      }

      <form (ngSubmit)="login()">
        <label class="label">Email</label>
        <input class="input" type="email" [(ngModel)]="email" name="email"
          placeholder="ukaleem540@gmail.com" autocomplete="username" required />

        <label class="label">Password</label>
        <input class="input" type="password" [(ngModel)]="password" name="password"
          placeholder="••••••••" autocomplete="current-password" required />

        <button class="btn" type="submit" [disabled]="loading()">
          {{ loading() ? 'Signing in…' : 'Sign in as Super Admin' }}
        </button>
      </form>

      <div class="divider">or</div>
      <a class="company-link" href="/">Company Admin Login →</a>
    </div>
  `,
})
export class SaLoginComponent {
  private readonly auth = inject(SaAuthService);
  private readonly router = inject(Router);
  email = '';
  password = '';
  loading = signal(false);
  error = signal('');

  login() {
    if (!this.email || !this.password) return;
    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/sa/dashboard']),
      error: (e: any) => { this.error.set(e?.error?.message ?? 'Invalid credentials'); this.loading.set(false); },
    });
  }
}
