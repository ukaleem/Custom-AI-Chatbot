import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SaAuthService } from '../sa-auth.service';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-sa-settings',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-header">
      <h1 class="page-title">Account Settings</h1>
    </div>

    <div style="max-width:460px">
      <div class="card">
        <div class="card-title">Change Password</div>
        <p style="font-size:13px;color:var(--text-muted);margin-bottom:20px">
          Signed in as <strong>{{ auth.session()?.email }}</strong>
        </p>

        @if (success()) {
          <div style="background:#f0fdf4;border:1px solid #86efac;padding:12px 16px;border-radius:8px;margin-bottom:16px;font-size:13px;color:#15803d">
            ✓ Password updated successfully.
          </div>
        }
        @if (error()) {
          <div style="background:#fee2e2;color:#dc2626;padding:10px 14px;border-radius:6px;margin-bottom:16px;font-size:13px">{{ error() }}</div>
        }

        <form (ngSubmit)="change()">
          <div class="form-group">
            <label class="form-label">Current Password</label>
            <input class="form-control" type="password" [(ngModel)]="current" name="current" required />
          </div>
          <div class="form-group">
            <label class="form-label">New Password <small>(min. 8 characters)</small></label>
            <input class="form-control" type="password" [(ngModel)]="newPw" name="newPw" minlength="8" required />
          </div>
          <div class="form-group">
            <label class="form-label">Confirm New Password</label>
            <input class="form-control" type="password" [(ngModel)]="confirm" name="confirm" required />
          </div>
          @if (newPw && confirm && newPw !== confirm) {
            <div style="color:var(--danger);font-size:12px;margin-bottom:12px">Passwords do not match.</div>
          }
          <button type="submit" class="btn btn-primary"
            [disabled]="saving() || newPw !== confirm || newPw.length < 8">
            {{ saving() ? 'Updating…' : 'Update Password' }}
          </button>
        </form>
      </div>
    </div>
  `,
})
export class SaSettingsComponent {
  private readonly http = inject(HttpClient);
  readonly auth = inject(SaAuthService);
  private readonly base = environment.apiUrl;
  current = ''; newPw = ''; confirm = '';
  saving = signal(false);
  success = signal(false);
  error = signal('');

  async change() {
    if (this.newPw !== this.confirm || this.newPw.length < 8) return;
    this.saving.set(true); this.error.set(''); this.success.set(false);
    try {
      await firstValueFrom(this.http.put(`${this.base}/super-admin/password`,
        { currentPassword: this.current, newPassword: this.newPw },
        { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.token}` }) }
      ));
      this.success.set(true);
      this.current = ''; this.newPw = ''; this.confirm = '';
    } catch (e: any) {
      this.error.set(e?.error?.message ?? 'Failed to update password');
    } finally { this.saving.set(false); }
  }
}
