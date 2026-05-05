import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { firstValueFrom } from 'rxjs';

type Format = 'auto' | 'csv' | 'sql' | 'json' | 'text';

const SAMPLES: Record<string, string> = {
  csv: `title,content,category,tags
"Catania Cathedral","The Cathedral of Sant'Agata is a magnificent baroque church in Piazza del Duomo, built in the 12th century.","culture","baroque,cathedral,history"
"Mount Etna","Europe's highest active volcano at 3350m. Offers guided tours, cable car, and stunning views.","nature","volcano,hiking,views"
"La Pescheria Market","Famous open-air fish market near the Duomo. Lively atmosphere with fresh seafood and local produce.","food","market,seafood,local"`,

  sql: `INSERT INTO knowledge (title, content, category) VALUES
('Return Policy', 'Items can be returned within 30 days with original receipt. Refunds processed in 5-7 business days to original payment method.', 'policy'),
('Shipping Times', 'Standard shipping takes 3-5 business days. Express shipping available for 1-2 day delivery. Free on orders over $50.', 'shipping'),
('Contact Support', 'Reach our team at support@company.com or call 1-800-HELP Mon-Fri 9am-6pm EST.', 'contact');`,

  json: `[
  {
    "title": "Product Warranty",
    "content": "All products include a 1-year manufacturer warranty covering defects in materials and workmanship.",
    "category": "warranty",
    "tags": ["guarantee", "coverage", "repair"]
  },
  {
    "name": "Payment Methods",
    "description": "We accept Visa, Mastercard, PayPal, and Apple Pay. All transactions are secured with SSL encryption.",
    "type": "billing"
  }
]`,

  text: `Our company was founded in 2010 with the goal of making technology accessible to everyone.
We offer three main product lines: Basic, Professional, and Enterprise.
The Basic plan includes 5 users and 10GB storage for $29/month.
Professional supports up to 50 users with 100GB storage for $99/month.
Enterprise offers unlimited users and storage with custom pricing.
All plans include 24/7 customer support and automatic backups.`,
};

@Component({
  selector: 'app-knowledge-import',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  styles: [`
    .format-tab { padding: 8px 16px; border-radius: 8px; border: 1.5px solid var(--border); background: #fff; cursor: pointer; font-size: 13px; font-weight: 500; color: var(--text-muted); transition: all .15s; white-space: nowrap; }
    .format-tab.active { background: var(--primary); color: #fff; border-color: var(--primary); }
    .format-tab:hover:not(.active) { border-color: #94a3b8; color: var(--text); }
    .data-area { width: 100%; font-family: 'SF Mono', 'Cascadia Code', monospace; font-size: 12.5px; border: 1.5px solid var(--border); border-radius: 8px; padding: 14px; resize: vertical; line-height: 1.6; transition: border-color .15s; box-sizing: border-box; }
    .data-area:focus { border-color: var(--primary); outline: none; }
    .result-box { background: #f0fdf4; border: 1px solid #86efac; border-radius: 10px; padding: 16px; }
    .step-badge { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; background: var(--primary); color: #fff; font-size: 11px; font-weight: 700; flex-shrink: 0; margin-right: 8px; }
    .hint-box { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 12px 16px; font-size: 13px; }
    .col-map-row { display: grid; grid-template-columns: 1fr 24px 1fr; gap: 8px; align-items: center; margin-bottom: 6px; }
    .template-btn { padding: 6px 12px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg); cursor: pointer; font-size: 12px; transition: all .15s; }
    .template-btn:hover { border-color: var(--primary); color: var(--primary); }
  `],
  template: `
    <div class="page-header">
      <h1 class="page-title">Import Data into Knowledge Base</h1>
      <a routerLink="/knowledge" class="btn btn-outline">← Back to Knowledge Base</a>
    </div>

    <!-- Quick Start Guide -->
    <div class="card" style="margin-bottom:16px;background:linear-gradient(135deg,#eff6ff 0%,#f0fdf4 100%);border-color:#bfdbfe">
      <div class="card-title" style="color:#1e40af">Quick Guide — 3 Steps to Import</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;font-size:13px">
        <div style="display:flex;align-items:flex-start;gap:8px">
          <span class="step-badge">1</span>
          <div><strong>Pick your format</strong><br><span style="color:var(--text-muted)">CSV, SQL, JSON, or plain text — we auto-detect it</span></div>
        </div>
        <div style="display:flex;align-items:flex-start;gap:8px">
          <span class="step-badge">2</span>
          <div><strong>Paste or type your data</strong><br><span style="color:var(--text-muted)">Load a sample to see what works, or paste your own</span></div>
        </div>
        <div style="display:flex;align-items:flex-start;gap:8px">
          <span class="step-badge">3</span>
          <div><strong>Click Import</strong><br><span style="color:var(--text-muted)">We map columns, embed vectors, and your bot is ready</span></div>
        </div>
      </div>
    </div>

    <!-- Format picker -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-title">1. Choose Format</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        @for (f of formats; track f.key) {
          <button class="format-tab" [class.active]="format()===f.key" (click)="setFormat(f.key)" type="button">
            {{ f.icon }} {{ f.label }}
          </button>
        }
      </div>

      <div class="hint-box">
        @if (format()==='auto') {
          <strong>Auto-detect:</strong> Just paste anything — CSV with headers, SQL INSERT statements, JSON arrays, or plain text paragraphs. We'll figure it out.
        } @else if (format()==='csv') {
          <strong>CSV format:</strong> First row = column headers. Key columns: <code>title</code>, <code>content</code>, <code>category</code>, <code>tags</code> (comma-separated). Aliases like <code>name</code>, <code>description</code>, <code>type</code> are auto-mapped.
        } @else if (format()==='sql') {
          <strong>SQL format:</strong> Paste <code>INSERT INTO table (col1, col2) VALUES (val1, val2);</code> statements. Column names are mapped automatically.
        } @else if (format()==='json') {
          <strong>JSON format:</strong> Paste a JSON array <code>[&#123;...&#125;]</code> or an object with <code>data</code>, <code>items</code>, or <code>records</code> array. Any field names work.
        } @else if (format()==='text') {
          <strong>Plain text:</strong> Paste any text — articles, FAQs, documents. Each paragraph becomes a knowledge item. We extract the first sentence as the title.
        }
      </div>

      <!-- Quick templates -->
      <div style="margin-top:12px">
        <span style="font-size:12px;color:var(--text-muted);margin-right:8px">Load example:</span>
        @for (f of formats.slice(1); track f.key) {
          <button class="template-btn" (click)="loadSample(f.key)" type="button" style="margin-right:6px;margin-bottom:4px">
            {{ f.icon }} {{ f.label }}
          </button>
        }
      </div>
    </div>

    <!-- Data input -->
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div class="card-title" style="margin:0">2. Paste Your Data</div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:12px;color:var(--text-muted)">{{ charCount() }} chars</span>
          @if (rawData) {
            <button class="btn btn-outline btn-sm" (click)="rawData='';result.set(null)" type="button">Clear</button>
          }
        </div>
      </div>
      <textarea class="data-area" [(ngModel)]="rawData" (ngModelChange)="result.set(null)"
        rows="12" [placeholder]="placeholder()" spellcheck="false"></textarea>

      <!-- Column mapping (collapsible) -->
      <details style="margin-top:12px">
        <summary style="font-size:12px;cursor:pointer;color:var(--text-muted);font-weight:500;padding:4px 0">
          Advanced: override column mapping (optional) ▾
        </summary>
        <div style="margin-top:10px">
          <p style="font-size:12px;color:var(--text-muted);margin-bottom:10px">
            Map your source column names to Knowledge Base fields. Leave blank for auto-detection.
          </p>
          @for (row of colMapRows; track $index) {
            <div class="col-map-row">
              <input class="form-control" [placeholder]="'Source column (e.g. ' + row.example + ')'"
                [(ngModel)]="row.source" [name]="'src' + $index" />
              <span style="text-align:center;color:var(--text-muted);font-weight:600">→</span>
              <select class="form-control" [(ngModel)]="row.target" [name]="'tgt' + $index">
                <option value="">auto</option>
                <option value="title">title</option>
                <option value="content">content</option>
                <option value="summary">summary</option>
                <option value="category">category</option>
                <option value="tags">tags</option>
              </select>
            </div>
          }
          <button class="btn btn-outline btn-sm" (click)="colMapRows.push({source:'',target:'',example:'field'})" type="button">+ Add mapping</button>
        </div>
      </details>
    </div>

    <!-- Result banner -->
    @if (result()) {
      <div class="result-box" style="margin-bottom:16px">
        <div style="font-weight:700;color:#15803d;font-size:15px;margin-bottom:8px">
          ✓ {{ result()!.created }} items imported successfully!
        </div>
        <div style="font-size:13px;color:#166534;display:flex;gap:16px;flex-wrap:wrap">
          <span>Format: <strong>{{ result()!.detected | uppercase }}</strong></span>
          <span>Parsed: <strong>{{ result()!.parsed }}</strong></span>
          <span>Created: <strong>{{ result()!.created }}</strong></span>
          @if (result()!.failed) { <span style="color:#dc2626">Failed: <strong>{{ result()!.failed }}</strong></span> }
        </div>
      </div>
    }

    @if (error()) {
      <div style="background:#fee2e2;color:#dc2626;padding:12px 16px;border-radius:8px;margin-bottom:16px;font-size:13px">
        <strong>Import failed:</strong> {{ error() }}
      </div>
    }

    <!-- Actions -->
    <div style="display:flex;gap:10px;align-items:center">
      <button class="btn btn-primary" (click)="importData()" [disabled]="importing() || !rawData.trim()" type="button">
        @if (importing()) { Importing… } @else { 3. Import Data }
      </button>
      @if (result()) {
        <a routerLink="/knowledge" class="btn btn-outline">View Knowledge Base →</a>
        <button class="btn btn-outline" (click)="importMore()" type="button">Import More</button>
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

  colMapRows: { source: string; target: string; example: string }[] = [
    { source: '', target: '', example: 'name' },
    { source: '', target: '', example: 'body' },
  ];

  readonly formats = [
    { key: 'auto' as Format, label: 'Auto-detect', icon: '🔍' },
    { key: 'csv'  as Format, label: 'CSV',         icon: '📊' },
    { key: 'sql'  as Format, label: 'SQL',         icon: '🗄️' },
    { key: 'json' as Format, label: 'JSON',        icon: '{ }' },
    { key: 'text' as Format, label: 'Plain Text',  icon: '📝' },
  ];

  charCount() { return this.rawData.length.toLocaleString(); }

  setFormat(f: Format) {
    this.format.set(f);
    this.error.set('');
    this.result.set(null);
  }

  loadSample(f: string) {
    this.rawData = SAMPLES[f] ?? '';
    this.format.set(f as Format);
    this.result.set(null);
    this.error.set('');
  }

  placeholder(): string {
    const f = this.format();
    if (f === 'csv')  return 'title,content,category\n"Item Title","Full description of the item","category-name"';
    if (f === 'sql')  return 'INSERT INTO table (title, content, category) VALUES\n(\'Item Title\', \'Full description\', \'category\');';
    if (f === 'json') return '[{"title": "Item Title", "content": "Full description", "category": "general"}]';
    if (f === 'text') return 'Our company offers three service tiers.\n\nThe Basic plan includes...\n\nThe Pro plan includes...';
    return 'Paste any data here — CSV, SQL INSERT, JSON array, or plain text. Format is detected automatically.';
  }

  importMore() {
    this.rawData = '';
    this.result.set(null);
    this.error.set('');
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

    // Handle plain text by pre-processing into paragraphs
    let data = this.rawData;
    let format: string = this.format();

    if (format === 'text') {
      // Convert paragraphs to JSON
      const paragraphs = data.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 20);
      const items = paragraphs.map(p => {
        const lines = p.split('\n').filter(Boolean);
        const title = lines[0].slice(0, 120).replace(/[.!?]$/, '');
        return { title, content: p, category: 'general' };
      });
      data = JSON.stringify(items);
      format = 'json';
    }

    try {
      const payload: Record<string, unknown> = { data, format };
      if (Object.keys(columnMap).length) payload['columnMap'] = columnMap;

      const res = await firstValueFrom(
        this.api.post<{ created: number; failed: number; detected: string; parsed: number }>(
          'knowledge/import', payload
        )
      );
      this.result.set(res);
      this.toast.success(`✓ ${res.created} items imported into Knowledge Base`);
    } catch (e: any) {
      const msg = e?.error?.message;
      this.error.set(Array.isArray(msg) ? msg.join(' · ') : (msg ?? 'Import failed. Check your data format and try again.'));
    } finally {
      this.importing.set(false);
    }
  }
}
