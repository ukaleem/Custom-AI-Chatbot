import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-widget-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-header">
      <h1 class="page-title">Embed Widget</h1>
    </div>

    <div style="max-width:640px">
      <div class="card" style="margin-bottom:20px">
        <div class="card-title">Add to your website</div>
        <p style="color:var(--text-muted);font-size:14px;margin-bottom:16px">Paste these 2 lines before <code>&lt;/body&gt;</code> in your HTML:</p>
        <div style="background:#1e293b;border-radius:8px;padding:20px;position:relative">
          <pre style="color:#e2e8f0;font-size:13px;font-family:monospace;white-space:pre-wrap;line-height:1.7;margin:0">{{ snippet() }}</pre>
          <button (click)="copy(snippet())" class="btn btn-outline btn-sm" style="position:absolute;top:12px;right:12px;background:#334155;border-color:#475569;color:#e2e8f0">
            {{ copied() ? '✓ Copied' : 'Copy' }}
          </button>
        </div>
      </div>

      <div class="card" style="margin-bottom:20px">
        <div class="card-title">Ionic / Angular integration</div>
        <p style="color:var(--text-muted);font-size:14px;margin-bottom:16px">Install the widget package and add to your module:</p>
        <div style="background:#1e293b;border-radius:8px;padding:20px">
          <pre style="color:#e2e8f0;font-size:13px;font-family:monospace;white-space:pre-wrap;margin:0">{{ ionicSnippet() }}</pre>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Configuration options</div>
        <table>
          <thead><tr><th>Attribute</th><th>Description</th><th>Default</th></tr></thead>
          <tbody>
            <tr><td><code>tenant-id</code></td><td>Your company slug (required)</td><td>—</td></tr>
            <tr><td><code>language</code></td><td>Force a language (en, it, de, fr, es) or "auto"</td><td>auto</td></tr>
            <tr><td><code>position</code></td><td>Widget position: bottom-right, bottom-left</td><td>bottom-right</td></tr>
            <tr><td><code>theme</code></td><td>Override primary color (hex)</td><td>From bot config</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class WidgetSettingsComponent {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  copied = signal(false);

  snippet(): string {
    const slug = this.auth.session()?.tenant?.slug ?? 'YOUR_SLUG';
    const origin = environment.apiUrl.replace('/api/v1', '');
    return `<script src="${origin}/widget/chatbot.js"></script>\n<catania-bot tenant-id="${slug}" language="auto" api-url="${origin}"></catania-bot>`;
  }

  ionicSnippet(): string {
    const slug = this.auth.session()?.tenant?.slug ?? 'YOUR_SLUG';
    return `// app.module.ts\nimport { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';\n\n@NgModule({ schemas: [CUSTOM_ELEMENTS_SCHEMA] })\n\n// In your page template:\n<catania-bot tenant-id="${slug}" language="auto"></catania-bot>`;
  }

  copy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      this.copied.set(true);
      this.toast.success('Copied to clipboard!');
      setTimeout(() => this.copied.set(false), 2000);
    });
  }
}
