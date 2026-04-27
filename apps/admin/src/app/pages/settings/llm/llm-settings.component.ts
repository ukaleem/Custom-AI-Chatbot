import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

const DEFAULT_MODELS: Record<string, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-6',
  gemini: 'gemini-1.5-flash',
  mistral: 'mistral-large-latest',
};

@Component({
  selector: 'app-llm-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <h1 class="page-title">LLM API Key</h1>
    </div>

    <div style="max-width:560px">
      <!-- Key-saved banner shown after a successful save -->
      @if (keySaved()) {
        <div style="background:#f0fdf4;border:1px solid #86efac;padding:12px 16px;border-radius:8px;margin-bottom:16px;font-size:13px;display:flex;align-items:center;gap:8px">
          <span style="color:#16a34a;font-size:16px">✓</span>
          <span><strong>API key saved.</strong> It is stored securely and never shown again. To replace it, paste a new key below.</span>
        </div>
      }

      <div class="card" style="margin-bottom:16px;background:#fffbeb;border-color:#fcd34d">
        <strong>Security note:</strong> Your LLM provider key is stored server-side and never returned. The input clears after saving — that is normal and means the key was saved.
      </div>

      <form (ngSubmit)="save()" class="card">
        <div class="card-title">LLM Provider</div>
        <div class="form-group">
          <label class="form-label">Provider</label>
          <select class="form-control" [(ngModel)]="provider" name="provider" (ngModelChange)="onProviderChange()">
            <option value="openai">OpenAI (GPT-4o)</option>
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="gemini">Google Gemini</option>
            <option value="mistral">Mistral AI</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">API Key {{ keySaved() ? '(leave blank to keep existing)' : '' }}</label>
          <input class="form-control" [(ngModel)]="apiKey" name="apiKey" type="password"
            [placeholder]="apiKeyPlaceholder()"
            autocomplete="new-password" />
          <small style="color:var(--text-muted);font-size:12px;margin-top:4px;display:block">
            Get your key from <a [href]="providerUrl()" target="_blank">{{ provider }} dashboard</a>
          </small>
        </div>
        <div class="form-group">
          <label class="form-label">Model (optional — leave blank for default)</label>
          <input class="form-control" [(ngModel)]="model" name="model" [placeholder]="DEFAULT_MODELS[provider]" />
        </div>

        @if (provider === 'anthropic') {
          <div style="background:#fef3c7;border:1px solid #f59e0b;padding:12px;border-radius:6px;margin-bottom:16px;font-size:13px">
            Anthropic does not support embeddings. The bot uses your Anthropic key for chat but needs an OpenAI key for vector search. Save OpenAI first, then come back to set Anthropic if needed.
          </div>
        }

        @if (saveError()) {
          <div style="background:#fee2e2;color:#dc2626;padding:10px 14px;border-radius:6px;margin-bottom:16px;font-size:13px">
            {{ saveError() }}
          </div>
        }

        <button type="submit" class="btn btn-primary" [disabled]="saving() || !apiKey">
          {{ saving() ? 'Saving…' : 'Save API Key' }}
        </button>
      </form>
    </div>
  `,
})
export class LlmSettingsComponent implements OnInit {
  readonly DEFAULT_MODELS = DEFAULT_MODELS;
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  saving = signal(false);
  keySaved = signal(false);
  saveError = signal('');
  provider = 'openai';
  apiKey = '';
  model = '';

  ngOnInit() {
    // Load current provider so the dropdown reflects the saved setting
    this.api.get<{ plan: string; usage: unknown; botConfig: unknown; llmProvider?: string }>('settings').subscribe({
      next: (r) => {
        if ((r as Record<string, unknown>)['llmProvider']) {
          this.provider = (r as Record<string, unknown>)['llmProvider'] as string;
        }
      },
      error: () => {},
    });
  }

  onProviderChange() { this.model = ''; }

  apiKeyPlaceholder(): string {
    if (this.keySaved()) return '••••••••  (key is stored — paste new key to replace)';
    const map: Record<string, string> = { openai: 'sk-...', anthropic: 'sk-ant-...', gemini: 'AIza...', mistral: 'Your Mistral key' };
    return map[this.provider] ?? 'Your API key';
  }

  providerUrl(): string {
    const urls: Record<string, string> = { openai: 'https://platform.openai.com/api-keys', anthropic: 'https://console.anthropic.com/', gemini: 'https://aistudio.google.com/app/apikey', mistral: 'https://console.mistral.ai/' };
    return urls[this.provider] ?? '#';
  }

  save() {
    if (!this.apiKey) return;
    this.saving.set(true);
    this.saveError.set('');
    this.api.put('settings/llm', { provider: this.provider, apiKey: this.apiKey, model: this.model || undefined }).subscribe({
      next: () => {
        this.toast.success('API key saved successfully');
        this.apiKey = '';
        this.keySaved.set(true);
        this.saving.set(false);
      },
      error: (e) => {
        const msg = e?.error?.message;
        this.saveError.set(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Save failed — check your key and try again'));
        this.toast.error('Failed to save');
        this.saving.set(false);
      },
    });
  }
}
