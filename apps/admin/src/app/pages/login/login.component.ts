import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  styles: [`
    .login-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f1f5f9; }
    .login-card { background: #fff; border-radius: 12px; padding: 40px; width: 100%; max-width: 380px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .login-logo { font-size: 24px; font-weight: 700; margin-bottom: 8px; color: #1e293b; }
    .login-logo span { color: #2563eb; }
    .login-sub { color: var(--text-muted); font-size: 14px; margin-bottom: 28px; }
    .error-msg { background: #fee2e2; color: #dc2626; padding: 10px 14px; border-radius: 6px; font-size: 13px; margin-bottom: 16px; }
  `],
  template: `
    <div class="login-wrap">
      <div class="login-card">
        <div class="login-logo">Catania <span>AI Bot</span></div>
        <div class="login-sub">Admin Dashboard — Sign in</div>

        @if (error()) {
          <div class="error-msg">{{ error() }}</div>
        }

        <form (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label class="form-label">Company slug</label>
            <input class="form-control" [(ngModel)]="slug" name="slug" placeholder="catania-city-pass" required />
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input class="form-control" type="password" [(ngModel)]="password" name="password" placeholder="••••••••" required />
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;margin-top:8px" [disabled]="loading()">
            {{ loading() ? 'Signing in...' : 'Sign in' }}
          </button>
        </form>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  slug = '';
  password = '';
  loading = signal(false);
  error = signal('');

  onSubmit() {
    if (!this.slug || !this.password) return;
    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.slug, this.password).subscribe({
      next: () => this.router.navigate(['/']),
      error: (e) => {
        this.error.set(e?.error?.message ?? 'Invalid credentials');
        this.loading.set(false);
      },
    });
  }
}
