import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { firstValueFrom } from 'rxjs';

type Format = 'auto' | 'csv' | 'sql' | 'json';

const SAMPLES: Record<Format, string> = {
  auto: '',
  csv: `title,content,category,tags
"Return Policy","Items can be returned within 30 days with receipt. Refunds processed in 5-7 business days.","policy","refund,returns"
"Shipping Times","Standard shipping 3-5 days. Express 1-2 days. Free on orders over $50.","shipping","delivery,shipping"`,
  sql: `INSERT INTO knowledge (title, content, category) VALUES
('Reset Password', 'Go to Settings > Security > Reset Password. Enter your email and follow the link.', 'support'),
('Payment Methods', 'We accept Visa, Mastercard, PayPal, and Apple Pay. All transactions are secured.', 'billing');`,
  json: `[
  {"title": "Product Warranty", "content": "All products come with 1-year manufacturer warranty.", "category": "support", "tags": ["warranty","guarantee"]},
  {"name": "Contact Us", "description": "Reach our support team at support@example.com or call 1-800-HELP.", "type": "contact"}
]`,
};

@Component({
  selector: 'app-knowledge-import',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  styles: [`
    .format-tabs { display: flex; gap: 4px; margin-bottom: 12px; }
    .format-tab { padding: 7px 14px; border-radius: 6px; border: 1px solid var(--border); background: #fff; cursor: pointer; font-size: 13px; font-weight: 500; color: var(--text-muted); transition: all .15s; }
    .format-tab.active { background: var(--primary); color: #fff; border-color: var(--primary); }
    .data-area { width: 100%; font-family: monospace; font-size: 12px; border: 1px solid var(--border); border-radius: 8px; padding: 12px; resize: vertical; line-height: 1.5; }
    .result-box { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; }
    .hint { font-size: 12px; color: var(--text-muted); margin-top: 6px; }
    .col-map-row { display: grid; grid-template-columns: 1fr auto 1fr; gap: 8px; align-items: center; margin-bottom: 6px; font-size: 13px; }
  `],
  template: `
    <div class="page-header">
      <h1 class="page-title">Import Data into Knowledge Base</h1>
      <a routerLink="/knowledge" class="btn btn-outline">← Back</a>
    </div>

    <!-- Format selector -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-title">Data Format</div>
      <div class="format-tabs">
        @for (f of formats; track f.key) {
          <button class="format-tab" [class.active]="format()===f.key" (click)="setFormat(f.key)">
            {{ f.icon }} {{ f.label }}
          </button>
        }
      </div>
      <p class="hint">
        @if (format()==='auto') { Format is detected automatically — CSV, SQL INSERT statements, or JSON arrays. }
        @else if (format()==='csv') { First row must be column headers. Columns auto-mapped to title, content, category, tags. }
        @else if (format()==='sql') { Paste SQL INSERT INTO statements. Column names are mapped intelligently. }
        @else { JSON array of objects or &#123;"data":[...]&#125;. Any column names are accepted. }
      </p>
      <button class="btn btn-outline btn-sm" (click)="loadSample()">Load sample {{ format() }} data</button>
    </div>

    <!-- Data input -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-title">Paste or Type Your Data</div>
      <textarea class="data-area" [(ngModel)]="rawData" rows="14"
        [placeholder]="placeholder()" spellcheck="false"></textarea>
    </div>

    <!-- Advanced: column mapping -->
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div class="card-title" style="margin:0">Column Mapping (optional)</div>
        <button class="btn btn-outline btn-sm" (click)="showMap.set(!showMap())">
          {{ showMap() ? 'Hide' : 'Show' }} mapping
        </button>
      </div>
      @if (showMap()) {
        <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px">
          If your column names don't match our field names, map them here.
          Leave blank to use auto-detection.
        </p>
        @for (row of colMapRows; track row.source) {
          <div class="col-map-row">
            <input class="form-control" [placeholder]="'Source column (e.g. ' + row.example + ')'"
              [(ngModel)]="row.source" [name]="'src_' + $index" />
            <span style="color:var(--text-muted)">→</span>
            <select class="form-control" [(ngModel)]="row.target" [name]="'tgt_' + $index">
              <option value="">auto-detect</option>
              <option value="title">title</option>
              <option value="content">content</option>
              <option value="summary">summary</option>
              <option value="category">category</option>
              <option value="tags">tags</option>
            </select>
          </div>
        }
        <button class="btn btn-outline btn-sm" (click)="addMapRow()">+ Add mapping</button>
      }
    </div>

    <!-- Import result -->
    @if (result()) {
      <div class="result-box" style="margin-bottom:16px">
        <div style="font-weight:700;color:#15803d;margin-bottom:6px">
          ✓ Import complete — {{ result()!.created }} items added
        </div>
        <div style="font-size:13px;color:#166534">
          Format detected: <strong>{{ result()!.detected | uppercase }}</strong> ·
          Parsed: {{ result()!.parsed }} rows ·
          Created: {{ result()!.created }} ·
          @if (result()!.failed) { <span style="color:#dc2626">Failed: {{ result()!.failed }}</span> }
        </div>
      </div>
    }

    @if (error()) {
      <div style="background:#fee2e2;color:#dc2626;padding:12px 16px;border-radius:8px;margin-bottom:16px;font-size:13px">
        {{ error() }}
      </div>
    }

    <!-- Actions -->
    <div style="display:flex;gap:10px">
      <button class="btn btn-primary" (click)="importData()" [disabled]="importing() || !rawData.trim()">
        {{ importing() ? 'Importing…' : 'Import Data' }}
      </button>
      @if (result()) {
        <a routerLink="/knowledge" class="btn btn-outline">View Knowledge Base</a>
      }
    </div>
  `,
})
export class KnowledgeImportComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  readonly router = inject(Router);

  format = signal<Format>('auto');
  rawData = '';
  importing = signal(false);
  result = signal<{ created: number; failed: number; detected: string; parsed: number } | null>(null);
  error = signal('');
  showMap = signal(false);

  colMapRows: { source: string; target: string; example: string }[] = [
    { source: '', target: '', example: 'name' },
    { source: '', target: '', example: 'body' },
    { source: '', target: '', example: 'type' },
  ];

  readonly formats = [
    { key: 'auto' as Format, label: 'Auto-detect', icon: '🔍' },
    { key: 'csv' as Format, label: 'CSV', icon: '📊' },
    { key: 'sql' as Format, label: 'SQL', icon: '🗄️' },
    { key: 'json' as Format, label: 'JSON', icon: '[ ]' },
  ];

  setFormat(f: Format) {
    this.format.set(f);
    this.rawData = '';
    this.result.set(null);
    this.error.set('');
  }

  loadSample() {
    this.rawData = SAMPLES[this.format()];
    this.result.set(null);
    this.error.set('');
  }

  placeholder(): string {
    const f = this.format();
    if (f === 'csv') return 'title,content,category,tags\n"FAQ 1","Answer text","support","faq,help"';
    if (f === 'sql') return 'INSERT INTO data (name, description, type) VALUES\n(\'Item 1\', \'Description here\', \'product\');';
    if (f === 'json') return '[{"title":"Item 1","content":"Description...","category":"general"}]';
    return 'Paste your data here — CSV, SQL INSERT statements, or JSON array. Format detected automatically.';
  }

  addMapRow() {
    this.colMapRows.push({ source: '', target: '', example: 'column' });
  }

  async importData() {
    if (!this.rawData.trim()) return;
    this.importing.set(true);
    this.error.set('');
    this.result.set(null);

    const columnMap: Record<string, string> = {};
    for (const row of this.colMapRows) {
      if (row.source.trim() && row.target) columnMap[row.source.trim()] = row.target;
    }

    try {
      const res = await firstValueFrom(
        this.api.post<{ created: number; failed: number; detected: string; parsed: number }>('knowledge/import', {
          data: this.rawData,
          format: this.format(),
          ...(Object.keys(columnMap).length ? { columnMap } : {}),
        })
      );
      this.result.set(res);
      this.toast.success(`Imported ${res.created} items successfully`);
      this.rawData = '';
    } catch (e: any) {
      this.error.set(e?.error?.message ?? 'Import failed — check your data format and try again');
    } finally {
      this.importing.set(false);
    }
  }
}
