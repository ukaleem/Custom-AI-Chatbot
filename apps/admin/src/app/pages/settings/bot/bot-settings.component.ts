import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

interface BotConfig { botName: string; greeting: string; primaryColor: string; defaultLanguage: string; }

@Component({
  selector: 'app-bot-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <h1 class="page-title">Bot Configuration</h1>
    </div>

    @if (loading()) {
      <div class="loading"><div class="spinner"></div></div>
    } @else {
      <form (ngSubmit)="save()" style="max-width:560px">
        <div class="card" style="margin-bottom:16px">
          <div class="card-title">Identity</div>
          <div class="form-group">
            <label class="form-label">Bot Name</label>
            <input class="form-control" [(ngModel)]="form.botName" name="botName" placeholder="Catania Guide" />
            <small style="color:var(--text-muted);font-size:12px;margin-top:4px;display:block">Shown in the chat window header.</small>
          </div>
          <div class="form-group">
            <label class="form-label">Opening Greeting</label>
            <textarea class="form-control" [(ngModel)]="form.greeting" name="greeting" rows="3" placeholder="Ciao! I'm your Catania guide..."></textarea>
          </div>
        </div>

        <div class="card" style="margin-bottom:16px">
          <div class="card-title">Appearance</div>
          <div class="form-group">
            <label class="form-label">Primary Color</label>
            <div style="display:flex;align-items:center;gap:12px">
              <input type="color" [(ngModel)]="form.primaryColor" name="primaryColor" />
              <input class="form-control" [(ngModel)]="form.primaryColor" name="primaryColorHex" style="max-width:130px;font-family:monospace" placeholder="#2563EB" />
              <div style="width:36px;height:36px;border-radius:8px;border:1px solid var(--border)" [style.background]="form.primaryColor"></div>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Default Language</label>
            <select class="form-control" [(ngModel)]="form.defaultLanguage" name="defaultLanguage">
              <option value="en">English</option>
              <option value="it">Italiano</option>
              <option value="de">Deutsch</option>
              <option value="fr">Français</option>
              <option value="es">Español</option>
            </select>
          </div>
        </div>

        @if (saveError()) {
          <div style="background:#fee2e2;color:#dc2626;padding:10px 14px;border-radius:6px;margin-bottom:16px;font-size:13px">
            {{ saveError() }}
          </div>
        }

        <button type="submit" class="btn btn-primary" [disabled]="saving()">
          {{ saving() ? 'Saving…' : 'Save Configuration' }}
        </button>
      </form>
    }
  `,
})
export class BotSettingsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  loading = signal(true);
  saving = signal(false);
  saveError = signal('');
  form: BotConfig = { botName: 'Guide', greeting: '', primaryColor: '#2563EB', defaultLanguage: 'en' };

  ngOnInit() {
    this.api.get<{ botConfig: Record<string, unknown> }>('settings').subscribe({
      next: (r) => {
        if (r?.botConfig) {
          // Only pick the 4 fields we send back — never let extra schema fields
          // (like logoUrl: '') leak into the form and cause validation errors.
          const c = r.botConfig;
          if (c['botName']) this.form.botName = c['botName'] as string;
          if (c['greeting']) this.form.greeting = c['greeting'] as string;
          if (c['primaryColor']) this.form.primaryColor = c['primaryColor'] as string;
          if (c['defaultLanguage']) this.form.defaultLanguage = c['defaultLanguage'] as string;
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  save() {
    this.saving.set(true);
    this.saveError.set('');
    // Send only the 4 form fields — never send logoUrl or other schema fields
    const payload: BotConfig = {
      botName: this.form.botName,
      greeting: this.form.greeting,
      primaryColor: this.form.primaryColor,
      defaultLanguage: this.form.defaultLanguage,
    };
    this.api.put<{ botConfig: BotConfig }>('settings/bot', payload).subscribe({
      next: (res) => {
        this.toast.success('Bot settings saved');
        if (res?.botConfig) {
          if (res.botConfig.botName) this.form.botName = res.botConfig.botName;
          if (res.botConfig.greeting) this.form.greeting = res.botConfig.greeting;
          if (res.botConfig.primaryColor) this.form.primaryColor = res.botConfig.primaryColor;
          if (res.botConfig.defaultLanguage) this.form.defaultLanguage = res.botConfig.defaultLanguage;
        }
        this.saving.set(false);
      },
      error: (e) => {
        const msg = e?.error?.message;
        this.saveError.set(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Save failed — check your input and try again'));
        this.toast.error('Failed to save');
        this.saving.set(false);
      },
    });
  }
}
