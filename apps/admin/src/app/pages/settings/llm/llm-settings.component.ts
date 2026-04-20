import { Component, inject, signal } from '@angular/core';
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
  imports: [FormsModule],
  template: `
    <div class="page-header">
      <h1 class="page-title">LLM API Key</h1>
    </div>

    <div style="max-width:560px">
      <div class="card" style="margin-bottom:16px;background:#fffbeb;border-color:#fcd34d">
        <strong>🔒 Security note:</strong> Your API key is stored encrypted and never returned after saving. Only you can replace it.
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
          <label class="form-label">API Key</label>
          <input class="form-control" [(ngModel)]="apiKey" name="apiKey" type="password"
            [placeholder]="provider === 'openai' ? 'sk-...' : provider === 'anthropic' ? 'sk-ant-...' : 'Enter your API key'"
            autocomplete="new-password" required minlength="10" />
          <small style="color:var(--text-muted);font-size:12px;margin-top:4px;display:block">
            Get your key from <a [href]="providerUrl()" target="_blank">{{ provider }} dashboard</a>
          </small>
        </div>
        <div class="form-group">
          <label class="form-label">Model (optional)</label>
          <input class="form-control" [(ngModel)]="model" name="model" [placeholder]="DEFAULT_MODELS[provider]" />
          <small style="color:var(--text-muted);font-size:12px;margin-top:4px;display:block">Leave blank to use the default model for this provider.</small>
        </div>

        @if (provider === 'anthropic') {
          <div style="background:#fef3c7;border:1px solid #f59e0b;padding:12px;border-radius:6px;margin-bottom:16px;font-size:13px">
            ⚠️ Anthropic doesn't provide an embeddings API. The bot will use your key for chat, but you also need an OpenAI key for vector search (via Settings → LLM → OpenAI).
          </div>
        }

        <button type="submit" class="btn btn-primary" [disabled]="saving() || !apiKey">
          {{ saving() ? 'Saving…' : 'Save API Key' }}
        </button>
      </form>
    </div>
  `,
})
export class LlmSettingsComponent {
  readonly DEFAULT_MODELS = DEFAULT_MODELS;
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  saving = signal(false);
  provider = 'openai';
  apiKey = '';
  model = '';

  onProviderChange() { this.model = ''; }

  providerUrl(): string {
    const urls: Record<string, string> = { openai: 'https://platform.openai.com/api-keys', anthropic: 'https://console.anthropic.com/', gemini: 'https://aistudio.google.com/app/apikey', mistral: 'https://console.mistral.ai/' };
    return urls[this.provider] ?? '#';
  }

  save() {
    if (!this.apiKey) return;
    this.saving.set(true);
    this.api.put('settings/llm', { provider: this.provider, apiKey: this.apiKey, model: this.model || undefined }).subscribe({
      next: () => { this.toast.success('API key saved successfully'); this.apiKey = ''; this.saving.set(false); },
      error: (e) => { this.toast.error(e?.error?.message ?? 'Failed to save'); this.saving.set(false); },
    });
  }
}
