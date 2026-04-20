import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

interface BotConfig { botName: string; greeting: string; primaryColor: string; defaultLanguage: string; }

@Component({
  selector: 'app-bot-settings',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-header">
      <h1 class="page-title">Bot Configuration</h1>
    </div>

    <form (ngSubmit)="save()" style="max-width:560px">
      <div class="card" style="margin-bottom:16px">
        <div class="card-title">Identity</div>
        <div class="form-group">
          <label class="form-label">Bot Name</label>
          <input class="form-control" [(ngModel)]="form.botName" name="botName" placeholder="Catania Guide" />
          <small style="color:var(--text-muted);font-size:12px;margin-top:4px;display:block">Shown in the chat header and used in bot messages.</small>
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
            <input class="form-control" [(ngModel)]="form.primaryColor" name="primaryColorHex" style="max-width:120px;font-family:monospace" placeholder="#2563EB" />
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

      <button type="submit" class="btn btn-primary" [disabled]="saving()">
        {{ saving() ? 'Saving…' : 'Save Configuration' }}
      </button>
    </form>
  `,
})
export class BotSettingsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  saving = signal(false);
  form: BotConfig = { botName: '', greeting: '', primaryColor: '#2563EB', defaultLanguage: 'en' };

  ngOnInit() {
    this.api.get<{ botConfig: BotConfig }>('settings').subscribe((r) => {
      if (r.botConfig) Object.assign(this.form, r.botConfig);
    });
  }

  save() {
    this.saving.set(true);
    this.api.put('settings/bot', this.form).subscribe({
      next: () => { this.toast.success('Bot settings saved'); this.saving.set(false); },
      error: () => { this.toast.error('Failed to save'); this.saving.set(false); },
    });
  }
}
