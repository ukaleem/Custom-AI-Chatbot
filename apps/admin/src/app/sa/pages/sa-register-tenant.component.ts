import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { SaAuthService } from '../sa-auth.service';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-sa-register-tenant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <h1 class="page-title">Register New Company</h1>
    </div>

    <form (ngSubmit)="submit()" style="max-width:560px">
      <div class="card" style="margin-bottom:16px">
        <div class="card-title">Company Details</div>

        <div class="form-group">
          <label class="form-label">Company Name *</label>
          <input class="form-control" [(ngModel)]="form.name" name="name" placeholder="Catania City Pass" required />
        </div>
        <div class="form-group">
          <label class="form-label">Slug * <small style="color:var(--text-muted)">(URL-safe, unique identifier)</small></label>
          <input class="form-control" [(ngModel)]="form.slug" name="slug" placeholder="catania-city-pass"
            pattern="[a-z0-9-]+" (input)="autoSlug()" required />
          <small style="font-size:12px;color:var(--text-muted)">Used for login and widget embed. Lowercase, hyphens only.</small>
        </div>
        <div class="form-group">
          <label class="form-label">Admin Email *</label>
          <input class="form-control" type="email" [(ngModel)]="form.adminEmail" name="adminEmail" placeholder="admin@company.com" required />
        </div>
        <div class="form-group">
          <label class="form-label">Admin Password *</label>
          <input class="form-control" type="password" [(ngModel)]="form.password" name="password" placeholder="Min. 8 characters" minlength="8" required />
          <small style="font-size:12px;color:var(--text-muted)">Send this to the company with their slug for dashboard access.</small>
        </div>
        <div class="form-group">
          <label class="form-label">Plan</label>
          <select class="form-control" [(ngModel)]="form.plan" name="plan">
            <option value="starter">Starter — $49/mo · 500 sessions</option>
            <option value="pro">Pro — $149/mo · 5,000 sessions</option>
            <option value="enterprise">Enterprise — Custom · Unlimited</option>
          </select>
        </div>
      </div>

      @if (result()) {
        <div style="background:#f0fdf4;border:1px solid #86efac;padding:16px;border-radius:8px;margin-bottom:16px;font-size:13px">
          <div style="font-weight:700;color:#15803d;margin-bottom:8px">✓ Company registered successfully!</div>
          <div>API Key: <code style="background:#dcfce7;padding:2px 6px;border-radius:4px">{{ result()!.apiKey }}</code></div>
          <div style="margin-top:8px;color:#166534">Share with the company: slug <strong>{{ form.slug }}</strong> + password you set above.</div>
        </div>
      }

      @if (error()) {
        <div style="background:#fee2e2;color:#dc2626;padding:10px 14px;border-radius:6px;margin-bottom:16px;font-size:13px">{{ error() }}</div>
      }

      <div style="display:flex;gap:10px">
        <button type="submit" class="btn btn-primary" [disabled]="saving()">
          {{ saving() ? 'Registering…' : 'Register Company' }}
        </button>
        <button type="button" class="btn btn-outline" (click)="router.navigate(['/sa/tenants'])">Back</button>
      </div>
    </form>
  `,
})
export class SaRegisterTenantComponent {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(SaAuthService);
  readonly router = inject(Router);
  private readonly base = environment.apiUrl;

  form = { name: '', slug: '', adminEmail: '', password: '', plan: 'starter' };
  saving = signal(false);
  result = signal<{ apiKey: string } | null>(null);
  error = signal('');

  autoSlug() {
    if (!this.form.slug) {
      this.form.slug = this.form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
  }

  async submit() {
    this.saving.set(true);
    this.error.set('');
    this.result.set(null);
    try {
      const headers = new HttpHeaders({ Authorization: `Bearer ${this.auth.token}` });
      // Step 1: Create tenant
      const tenant: any = await firstValueFrom(this.http.post(`${this.base}/super-admin/tenants`,
        { name: this.form.name, slug: this.form.slug, adminEmail: this.form.adminEmail, plan: this.form.plan },
        { headers }
      ));
      // Step 2: Set admin password
      await firstValueFrom(this.http.post(`${this.base}/super-admin/tenants/${tenant._id}/set-password`,
        { password: this.form.password }, { headers }
      ));
      this.result.set({ apiKey: tenant.apiKey });
      this.form = { name: '', slug: '', adminEmail: '', password: '', plan: 'starter' };
    } catch (e: any) {
      this.error.set(e?.error?.message ?? 'Failed to register company');
    } finally {
      this.saving.set(false);
    }
  }
}
