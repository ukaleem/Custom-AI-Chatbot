import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { firstValueFrom } from 'rxjs';

interface BotConfig {
  botName: string;
  greeting: string;
  primaryColor: string;
  defaultLanguage: string;
  persona: string;
  systemInstruction: string;
}

interface PersonaMeta {
  key: string;
  name: string;
  description: string;
  hasDefaultInstruction: boolean;
}

@Component({
  selector: 'app-bot-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    .persona-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; margin-bottom: 16px; }
    .persona-card { border: 2px solid var(--border); border-radius: 10px; padding: 14px; cursor: pointer; transition: all .15s; }
    .persona-card:hover { border-color: #94a3b8; background: var(--bg); }
    .persona-card.selected { border-color: var(--primary); background: #eff6ff; }
    .persona-icon { font-size: 22px; margin-bottom: 6px; }
    .persona-name { font-weight: 600; font-size: 13px; margin-bottom: 3px; }
    .persona-desc { font-size: 11px; color: var(--text-muted); line-height: 1.4; }
    .instruction-area { width: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; border: 1px solid var(--border); border-radius: 8px; padding: 12px; resize: vertical; line-height: 1.6; min-height: 160px; }
    .preview-box { background: #1e293b; border-radius: 8px; padding: 14px; font-size: 12px; font-family: monospace; color: #94a3b8; white-space: pre-wrap; line-height: 1.5; max-height: 160px; overflow-y: auto; }
  `],
  template: `
    <div class="page-header">
      <h1 class="page-title">Bot Configuration</h1>
    </div>

    @if (loading()) {
      <div class="loading"><div class="spinner"></div></div>
    } @else {
      <form (ngSubmit)="save()" style="max-width:720px">

        <!-- ── Identity ── -->
        <div class="card" style="margin-bottom:16px">
          <div class="card-title">Bot Identity</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group">
              <label class="form-label">Bot Name</label>
              <input class="form-control" [(ngModel)]="form.botName" name="botName" placeholder="Catania Guide" />
              <small style="font-size:11px;color:var(--text-muted)">Shown in the chat window header</small>
            </div>
            <div class="form-group">
              <label class="form-label">Primary Color</label>
              <div style="display:flex;align-items:center;gap:10px">
                <input type="color" [(ngModel)]="form.primaryColor" name="primaryColor" style="width:40px;height:36px;cursor:pointer;border:none;padding:0" />
                <input class="form-control" [(ngModel)]="form.primaryColor" name="primaryColorHex" style="font-family:monospace;max-width:100px" placeholder="#2563EB" />
                <div style="width:36px;height:36px;border-radius:8px;border:1px solid var(--border)" [style.background]="form.primaryColor"></div>
              </div>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Opening Greeting</label>
            <textarea class="form-control" [(ngModel)]="form.greeting" name="greeting" rows="2"
              placeholder="Hello! I'm your guide. How can I help you today?"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Default Language</label>
            <select class="form-control" [(ngModel)]="form.defaultLanguage" name="defaultLanguage" style="max-width:200px">
              <option value="en">English</option>
              <option value="it">Italiano</option>
              <option value="de">Deutsch</option>
              <option value="fr">Français</option>
              <option value="es">Español</option>
            </select>
          </div>
        </div>

        <!-- ── Persona / Role ── -->
        <div class="card" style="margin-bottom:16px">
          <div class="card-title">Bot Persona & Role</div>
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:14px">
            Choose what kind of bot you want. Each persona gives the AI a specific role, behaviour, and tone.
            Select <strong>Custom</strong> to write your own instructions.
          </p>

          <div class="persona-grid">
            @for (p of personas(); track p.key) {
              <div class="persona-card" [class.selected]="form.persona === p.key"
                (click)="selectPersona(p.key)">
                <div class="persona-icon">{{ personaIcon(p.key) }}</div>
                <div class="persona-name">{{ p.name }}</div>
                <div class="persona-desc">{{ p.description }}</div>
              </div>
            }
          </div>

          <!-- Custom instruction editor -->
          <div class="form-group" style="margin-top:4px">
            <label class="form-label" style="display:flex;align-items:center;justify-content:space-between">
              <span>
                @if (form.persona === 'custom') { Custom System Instruction * }
                @else { System Instruction <small style="font-weight:400;color:var(--text-muted)">(auto-filled from persona — edit to customise)</small> }
              </span>
              <button type="button" class="btn btn-outline btn-sm" style="font-size:11px" (click)="resetInstruction()">
                Reset to {{ personaName(form.persona) }} default
              </button>
            </label>
            <textarea class="instruction-area"
              [(ngModel)]="form.systemInstruction" name="systemInstruction"
              [placeholder]="form.persona === 'custom' ? 'Describe the bot role, rules, and tone in detail...' : 'The default instruction for this persona is pre-filled above. Edit to customise.'">
            </textarea>
            <small style="font-size:11px;color:var(--text-muted)">
              The instruction tells the AI how to behave — what to answer, what to avoid, and what tone to use.
              The bot name is automatically prepended.
            </small>
          </div>

          <!-- Live preview of the full system prompt -->
          <details style="margin-top:12px">
            <summary style="font-size:12px;cursor:pointer;color:var(--text-muted);font-weight:500">Preview full system prompt sent to the AI →</summary>
            <div class="preview-box" style="margin-top:8px">{{ previewPrompt() }}</div>
          </details>
        </div>

        @if (saveError()) {
          <div style="background:#fee2e2;color:#dc2626;padding:10px 14px;border-radius:6px;margin-bottom:16px;font-size:13px">{{ saveError() }}</div>
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
  personas = signal<PersonaMeta[]>([]);

  form: BotConfig = {
    botName: 'Guide',
    greeting: 'Hello! How can I help you today?',
    primaryColor: '#2563EB',
    defaultLanguage: 'en',
    persona: 'tourist-guide',
    systemInstruction: '',
  };

  private personaInstructions: Record<string, string> = {};

  ngOnInit() {
    Promise.all([
      firstValueFrom(this.api.get<{ botConfig: Record<string, unknown> }>('settings')),
      firstValueFrom(this.api.get<PersonaMeta[]>('settings/personas')),
    ]).then(([settings, personas]) => {
      this.personas.set(personas);
      const c = settings?.botConfig ?? {};
      this.form.botName       = (c['botName'] as string) || 'Guide';
      this.form.greeting      = (c['greeting'] as string) || '';
      this.form.primaryColor  = (c['primaryColor'] as string) || '#2563EB';
      this.form.defaultLanguage = (c['defaultLanguage'] as string) || 'en';
      this.form.persona       = (c['persona'] as string) || 'tourist-guide';
      this.form.systemInstruction = (c['systemInstruction'] as string) || '';
      this.loading.set(false);
    }).catch(() => this.loading.set(false));

    // Load persona default instructions from the API personas list
    this.api.get<{ instruction?: string; key: string }[]>('settings/personas').subscribe(ps => {
      ps.forEach(p => {
        if ((p as any).instruction !== undefined) this.personaInstructions[p.key] = (p as any).instruction ?? '';
      });
    });
  }

  selectPersona(key: string) {
    this.form.persona = key;
    // Auto-fill the instruction from the built-in persona, unless already customised
    const defaultInstruction = this.personaInstructions[key] ?? '';
    this.form.systemInstruction = defaultInstruction;
  }

  resetInstruction() {
    this.form.systemInstruction = this.personaInstructions[this.form.persona] ?? '';
  }

  personaIcon(key: string): string {
    const icons: Record<string, string> = {
      'tourist-guide': '🗺️', 'customer-support': '🎧', 'sales-assistant': '🛒',
      'hr-assistant': '👥', 'restaurant': '🍽️', 'e-commerce': '🛍️',
      'healthcare': '🏥', 'custom': '✏️',
    };
    return icons[key] ?? '🤖';
  }

  personaName(key: string): string {
    return this.personas().find(p => p.key === key)?.name ?? key;
  }

  previewPrompt(): string {
    const name = this.form.botName || 'Guide';
    const instruction = (this.form.systemInstruction || '').trim()
      || '(persona default instruction will be used)';
    return `You are ${name}.\n\n${instruction}\n\nAlways address the user directly. Keep responses focused, helpful, and concise.`;
  }

  async save() {
    this.saving.set(true);
    this.saveError.set('');
    const payload = {
      botName: this.form.botName,
      greeting: this.form.greeting,
      primaryColor: this.form.primaryColor,
      defaultLanguage: this.form.defaultLanguage,
      persona: this.form.persona,
      systemInstruction: this.form.systemInstruction,
    };
    try {
      const res = await firstValueFrom(this.api.put<{ botConfig: BotConfig }>('settings/bot', payload));
      this.toast.success('Bot configuration saved');
      if (res?.botConfig) {
        if (res.botConfig.botName) this.form.botName = res.botConfig.botName;
        if (res.botConfig.primaryColor) this.form.primaryColor = res.botConfig.primaryColor;
      }
    } catch (e: any) {
      const msg = e?.error?.message;
      this.saveError.set(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to save'));
      this.toast.error('Failed to save');
    } finally {
      this.saving.set(false);
    }
  }
}
