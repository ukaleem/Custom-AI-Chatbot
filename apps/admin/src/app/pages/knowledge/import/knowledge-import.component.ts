import { Component, inject, signal, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { firstValueFrom } from 'rxjs';

type Format = 'sql-file' | 'auto' | 'csv' | 'sql' | 'json' | 'text';

interface ParsedItem {
  title: string;
  content: string;
  summary?: string;
  category: string;
  tags: string[];
  metadata?: Record<string, unknown>;
  source: string;
  isActive: boolean;
}

// ─── Client-side SQL parser ──────────────────────────────────────────────────

const CATEGORY_CODES: Record<string, string> = {
  '001':'culture','002':'culture','003':'culture','004':'city-tour',
  '005':'entertainment','006':'shopping','007':'food','008':'transport',
  '009':'nature','010':'healthcare','011':'safety','012':'children',
  '044':'children','045':'culture','051':'culture','052':'entertainment',
  '053':'food','054':'culture','055':'shopping',
};

function fixEncoding(s: string): string {
  if (!s) return '';
  // Fix UTF-8 mojibake from Latin-1 misread (common in phpMyAdmin exports)
  try {
    const bytes = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i) & 0xff;
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  } catch { return s; }
}

function stripHtml(h: string): string {
  return (h || '')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/?p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

function mapCategoryCodes(codes: string): string {
  if (!codes) return 'general';
  for (const c of codes.split('|')) {
    const v = CATEGORY_CODES[c.trim()];
    if (v) return v;
  }
  return 'general';
}

// Generic column → knowledge field mapping
const FIELD_MAP: Record<string, string> = {
  titolo:'title', title:'title', name:'title', nome:'title', subject:'title',
  question:'title', heading:'title', label:'title',
  descrizione:'content', description:'content', content:'content',
  body:'content', testo:'content', text:'content', details:'content',
  answer:'content', information:'content',
  summary:'summary', excerpt:'summary', abstract:'summary',
  short_description:'summary', breve:'summary',
  categorie:'category', category:'category', tipo:'category', type:'category',
  group:'category', settore:'category', tags:'tags', keywords:'tags',
};

function parseRows(valStr: string): string[][] {
  const rows: string[][] = [];
  let buf = '', depth = 0, inStr = false, q = '';
  for (let i = 0; i < valStr.length; i++) {
    const ch = valStr[i];
    if (!inStr) {
      if (ch === "'" || ch === '"') { inStr = true; q = ch; }
      else if (ch === '(') { if (depth++ === 0) buf = ''; else buf += ch; }
      else if (ch === ')') {
        if (--depth === 0) { rows.push(splitVals(buf)); buf = ''; }
        else buf += ch;
      } else if (depth > 0) buf += ch;
    } else {
      if (ch === q && valStr[i-1] !== '\\') inStr = false;
      else if (ch === '\\' && (valStr[i+1] === q || valStr[i+1] === '\\')) buf += valStr[++i];
      else buf += ch;
    }
  }
  return rows;
}

function splitVals(row: string): string[] {
  const vals: string[] = []; let cur = '', inStr = false, q = '';
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (!inStr) {
      if (ch === "'" || ch === '"') { inStr = true; q = ch; }
      else if (ch === ',') { vals.push(cur.trim()); cur = ''; }
      else cur += ch;
    } else {
      if (ch === q && row[i-1] !== '\\') inStr = false;
      else if (ch === '\\' && (row[i+1] === q || row[i+1] === '\\')) cur += row[++i];
      else cur += ch;
    }
  }
  vals.push(cur.trim());
  return vals;
}

function parseSqlFile(sql: string): { items: ParsedItem[]; tables: string[] } {
  const items: ParsedItem[] = [];
  const tables: string[] = [];

  // Find all INSERT INTO blocks
  const re = /INSERT INTO\s+[`"']?(\w+)[`"']?\s+\(([^)]+)\)\s+VALUES([\s\S]+?);(?=\s*(?:INSERT|CREATE|DROP|ALTER|--|\/\*|$))/gim;
  let match: RegExpExecArray | null;

  while ((match = re.exec(sql)) !== null) {
    const tableName = match[1].toLowerCase();
    if (!tables.includes(tableName)) tables.push(tableName);

    const cols = match[2].split(',').map(c => c.trim().replace(/[`"']/g, '').toLowerCase());
    const rows = parseRows(match[3]);

    for (const row of rows) {
      const o: Record<string, string> = {};
      cols.forEach((c, i) => { o[c] = row[i] || ''; });

      // Skip deleted records (common flag in Italian systems)
      if (o['flag_cancellato'] === '1' || o['deleted'] === '1' || o['cancelled'] === '1') continue;

      // ── Catania-specific: attrazioni table ──────────────────────────────────
      if (tableName === 'attrazioni') {
        const title   = fixEncoding(o['titolo'] || '').trim();
        const content = stripHtml(fixEncoding(o['descrizione'] || ''));
        if (!title || content.length < 10) continue;

        items.push({
          title,
          content,
          summary: content.split('\n')[0].slice(0, 200),
          category: mapCategoryCodes(o['categorie']),
          tags: [
            'catania', 'sicily', 'city-pass',
            ...(o['flag_glutenfree'] === '1' ? ['gluten-free'] : []),
            ...(o['flag_vegana'] === '1' ? ['vegan'] : []),
            ...(o['flag_vegetariana'] === '1' ? ['vegetarian'] : []),
          ],
          metadata: {
            address: fixEncoding(o['indirizzo'] || ''),
            lat: parseFloat(o['latitudine']) || null,
            lng: parseFloat(o['longitudine']) || null,
            phone: o['cellulare'] || '',
            website: o['url'] || '',
            code: o['codice_attrazione'] || '',
          },
          source: 'sql',
          isActive: true,
        });
        continue;
      }

      // ── Catania-specific: attivita_commerciali table ────────────────────────
      if (tableName === 'attivita_commerciali') {
        const name = fixEncoding(o['ragione_sociale'] || '').trim();
        if (!name) continue;
        const parts = [
          o['indirizzo'] ? `Address: ${fixEncoding(o['indirizzo'])}, Catania` : '',
          o['cellulare'] ? `Phone: ${o['cellulare']}` : '',
          o['email']     ? `Email: ${o['email']}` : '',
          o['url']       ? `Website: ${o['url']}` : '',
        ].filter(Boolean);
        items.push({
          title: name,
          content: parts.join('\n') || `${name} — Catania City Pass partner`,
          summary: `${name} — official Catania City Pass partner`,
          category: o['flag_farmacia'] === '1' ? 'healthcare' :
                    o['flag_cinema']  === '1' ? 'entertainment' :
                    o['flag_teatro']  === '1' ? 'entertainment' : 'shopping',
          tags: ['catania', 'city-pass', 'partner'],
          metadata: { address: fixEncoding(o['indirizzo'] || ''), phone: o['cellulare'] || '' },
          source: 'sql',
          isActive: true,
        });
        continue;
      }

      // ── Generic table: auto-map columns ────────────────────────────────────
      let title = '', content = '', summary = '', category = 'general';
      const tags: string[] = [];
      const meta: Record<string, unknown> = {};

      for (const [col, val] of Object.entries(o)) {
        if (!val) continue;
        const target = FIELD_MAP[col];
        const fval = fixEncoding(val);
        if (target === 'title')    title    = fval;
        else if (target === 'content')  content  = stripHtml(fval);
        else if (target === 'summary')  summary  = fval;
        else if (target === 'category') category = fval;
        else if (target === 'tags')     tags.push(...fval.split(/[,;|]/));
        else meta[col] = fval;
      }

      // Fallback: first non-empty value is title
      if (!title) { const first = Object.values(o).find(v => v && v.length > 1); title = fixEncoding(first || ''); }
      if (!content && title) content = title;
      if (!title || !content) continue;

      items.push({ title, content: content || title, summary, category, tags, metadata: meta, source: 'sql', isActive: true });
    }
  }

  return { items, tables };
}

// ─── Sample data ──────────────────────────────────────────────────────────────
const SAMPLES: Record<string, string> = {
  csv: `title,content,category,tags
"Catania Cathedral","The Cathedral of Sant'Agata dominates Piazza del Duomo. Baroque masterpiece rebuilt after 1693 earthquake.","culture","baroque,cathedral,history"
"Mount Etna","Europe's highest active volcano at 3350m. Guided tours and cable car available.","nature","volcano,hiking"`,
  sql: `INSERT INTO knowledge (title, content, category) VALUES
('Return Policy', 'Items can be returned within 30 days with receipt.', 'policy'),
('Shipping', 'Standard 3-5 days. Express 1-2 days. Free on orders over $50.', 'shipping');`,
  json: `[{"title":"Product Warranty","content":"All products include 1-year warranty.","category":"support"},
{"name":"Contact Us","description":"support@company.com or 1-800-HELP.","type":"contact"}]`,
  text: `Our company provides three service tiers.

The Basic plan includes 5 users and 10GB storage for $29/month.

Enterprise offers unlimited users with custom pricing and dedicated support.`,
};

// ─── Component ────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-knowledge-import',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  styles: [`
    .tab-bar { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; border-bottom: 2px solid var(--border); padding-bottom: 12px; }
    .tab { padding: 8px 16px; border-radius: 8px 8px 0 0; border: 1.5px solid var(--border); border-bottom: none; background: var(--bg); cursor: pointer; font-size: 13px; font-weight: 500; color: var(--text-muted); transition: all .15s; white-space: nowrap; }
    .tab.active { background: var(--primary); color: #fff; border-color: var(--primary); }
    .tab:hover:not(.active) { border-color: #94a3b8; color: var(--text); }
    .drop-zone { border: 2.5px dashed var(--border); border-radius: 12px; padding: 48px 24px; text-align: center; cursor: pointer; transition: all .2s; background: #fafafa; }
    .drop-zone:hover, .drop-zone.drag-over { border-color: var(--primary); background: #eff6ff; }
    .drop-zone svg { color: #94a3b8; margin-bottom: 12px; }
    .drop-zone.drag-over svg { color: var(--primary); }
    .file-info { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 12px 16px; display: flex; align-items: center; gap: 10px; }
    .table-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; background: #dbeafe; color: #1d4ed8; margin-right: 4px; font-family: monospace; }
    .preview-table { font-size: 12px; border-collapse: collapse; width: 100%; }
    .preview-table th { background: var(--bg); font-weight: 600; text-align: left; padding: 6px 10px; border-bottom: 1px solid var(--border); font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted); }
    .preview-table td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .preview-table tr:hover td { background: var(--bg); }
    .data-area { width: 100%; font-family: 'SF Mono','Cascadia Code',monospace; font-size: 12.5px; border: 1.5px solid var(--border); border-radius: 8px; padding: 14px; resize: vertical; line-height: 1.6; transition: border-color .15s; box-sizing: border-box; }
    .data-area:focus { border-color: var(--primary); outline: none; }
    .hint-box { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 12px 16px; font-size: 13px; }
    .result-box { background: #f0fdf4; border: 1px solid #86efac; border-radius: 10px; padding: 16px; }
    .progress-bar { height: 8px; background: var(--border); border-radius: 4px; overflow: hidden; }
    .progress-fill { height: 100%; background: var(--primary); border-radius: 4px; transition: width .3s; }
    .step { display: flex; align-items: flex-start; gap: 10px; }
    .step-num { width: 24px; height: 24px; border-radius: 50%; background: var(--primary); color: #fff; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
  `],
  template: `
    <div class="page-header">
      <h1 class="page-title">Import Data into Knowledge Base</h1>
      <a routerLink="/knowledge" class="btn btn-outline">← Knowledge Base</a>
    </div>

    <!-- Quick guide -->
    <div class="card" style="margin-bottom:16px;background:linear-gradient(135deg,#eff6ff 0%,#f0fdf4 100%);border-color:#bfdbfe">
      <div class="card-title" style="color:#1e40af">3 steps to import any data</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px">
        <div class="step"><span class="step-num">1</span><div><strong>Choose method</strong><br><span style="font-size:12px;color:var(--text-muted)">Drop an SQL file or paste CSV/JSON/text</span></div></div>
        <div class="step"><span class="step-num">2</span><div><strong>Preview records</strong><br><span style="font-size:12px;color:var(--text-muted)">Review what will be imported before committing</span></div></div>
        <div class="step"><span class="step-num">3</span><div><strong>Import instantly</strong><br><span style="font-size:12px;color:var(--text-muted)">Bot learns from new data immediately</span></div></div>
      </div>
    </div>

    <!-- Tab bar -->
    <div class="tab-bar">
      @for (f of formats; track f.key) {
        <button class="tab" [class.active]="format()===f.key" (click)="setFormat(f.key)" type="button">
          {{ f.icon }} {{ f.label }}
        </button>
      }
    </div>

    <!-- ── SQL FILE UPLOAD (main feature) ── -->
    @if (format() === 'sql-file') {
      <div class="card" style="margin-bottom:16px">
        <div class="card-title">Drop your SQL database file</div>
        <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px">
          Drag and drop any <code>.sql</code> file exported from phpMyAdmin, MySQL Workbench, or <code>mysqldump</code>.
          The system auto-detects tables and maps fields to knowledge items.
        </p>

        @if (!sqlFile()) {
          <!-- Drop zone -->
          <div class="drop-zone" [class.drag-over]="dragging()"
            (dragover)="$event.preventDefault(); dragging.set(true)"
            (dragleave)="dragging.set(false)"
            (drop)="onDrop($event)"
            (click)="sqlInput.click()">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="display:block;margin:0 auto 12px">
              <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 12V4M8 8l4-4 4 4"/></svg>
            <div style="font-size:15px;font-weight:600;color:#1e293b;margin-bottom:4px">
              Drop your .sql file here
            </div>
            <div style="font-size:13px;color:var(--text-muted);margin-bottom:16px">or click to browse</div>
            <div style="font-size:12px;color:#94a3b8">
              Supports: mysqldump, phpMyAdmin export, MySQL Workbench · Any file size
            </div>
          </div>
          <input #sqlInput type="file" accept=".sql,text/plain,application/sql" style="display:none"
            (change)="onFileChange($event)" />
        } @else {
          <!-- File loaded -->
          <div class="file-info" style="margin-bottom:16px">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <div style="flex:1">
              <div style="font-weight:600;font-size:14px">{{ sqlFile()!.name }}</div>
              <div style="font-size:12px;color:var(--text-muted)">{{ fileSize() }} · {{ detectedTables().length }} table(s) detected</div>
            </div>
            <button class="btn btn-outline btn-sm" (click)="resetFile()" type="button">Change file</button>
          </div>

          <!-- Detected tables -->
          @if (detectedTables().length) {
            <div style="margin-bottom:14px">
              <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em">Detected tables</div>
              @for (t of detectedTables(); track t) {
                <span class="table-badge">{{ t }}</span>
              }
              <span style="font-size:12px;color:var(--text-muted);margin-left:8px">→ {{ parsedItems().length }} records extracted</span>
            </div>
          }

          <!-- Parsing state -->
          @if (parsing()) {
            <div style="margin-bottom:16px">
              <div style="font-size:13px;color:var(--text-muted);margin-bottom:6px">Parsing SQL...</div>
              <div class="progress-bar"><div class="progress-fill" style="width:80%"></div></div>
            </div>
          }

          <!-- Preview table -->
          @if (parsedItems().length > 0 && !parsing()) {
            <div style="margin-bottom:14px">
              <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:.04em">
                Preview (first {{ previewItems().length }} of {{ parsedItems().length }} records)
              </div>
              <div style="overflow-x:auto;border-radius:8px;border:1px solid var(--border)">
                <table class="preview-table">
                  <thead><tr>
                    <th>#</th><th>Title</th><th>Category</th><th>Content preview</th><th>Tags</th>
                  </tr></thead>
                  <tbody>
                    @for (item of previewItems(); track $index) {
                      <tr>
                        <td style="color:var(--text-muted)">{{ $index + 1 }}</td>
                        <td style="font-weight:500;max-width:180px">{{ item.title }}</td>
                        <td><span class="badge badge-blue" style="font-size:10px">{{ item.category }}</span></td>
                        <td style="color:var(--text-muted)">{{ item.content.slice(0,80) }}{{ item.content.length > 80 ? '…' : '' }}</td>
                        <td style="font-size:11px;color:var(--text-muted)">{{ item.tags.slice(0,3).join(', ') }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              @if (parsedItems().length > 5) {
                <div style="font-size:12px;color:var(--text-muted);padding:6px 10px">
                  + {{ parsedItems().length - 5 }} more records will be imported
                </div>
              }
            </div>

            <!-- Parse errors -->
            @if (parseWarnings().length) {
              <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:12px">
                <strong>⚠️ {{ parseWarnings().length }} rows skipped</strong> (missing title or content):
                {{ parseWarnings().slice(0,2).join('; ') }}
              </div>
            }
          }

          @if (parsedItems().length === 0 && !parsing()) {
            <div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;padding:12px 16px;font-size:13px;color:#dc2626">
              No importable records found in this SQL file. Make sure it contains INSERT INTO statements
              with title/name and description/content columns.
            </div>
          }
        }
      </div>
    }

    <!-- ── PASTE / TEXT FORMATS ── -->
    @if (format() !== 'sql-file') {
      <div class="card" style="margin-bottom:16px">
        <div class="hint-box" style="margin-bottom:14px">
          @if (format()==='auto') { <strong>Auto-detect:</strong> Paste CSV, SQL INSERT statements, JSON arrays, or plain paragraphs. }
          @else if (format()==='csv') { <strong>CSV:</strong> First row = headers. Key columns: title, content, category, tags. Aliases like name, description, type are auto-mapped. }
          @else if (format()==='sql') { <strong>SQL:</strong> Paste INSERT INTO statements. Column names are mapped automatically. }
          @else if (format()==='json') { <strong>JSON:</strong> Array of objects or &#123;"data":[...]&#125;. Any field names accepted. }
          @else if (format()==='text') { <strong>Plain text:</strong> Each paragraph becomes a knowledge item. First sentence is the title. }
        </div>

        <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
          <span style="font-size:12px;color:var(--text-muted);margin-right:4px">Load sample:</span>
          @for (f of formats.slice(1); track f.key) {
            @if (f.key !== 'sql-file') {
              <button class="btn btn-outline btn-sm" (click)="loadSample(f.key)" type="button">{{ f.icon }} {{ f.label }}</button>
            }
          }
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <label style="font-size:13px;font-weight:500">Paste your data</label>
          <span style="font-size:11px;color:var(--text-muted)">{{ rawData.length.toLocaleString() }} chars</span>
        </div>
        <textarea class="data-area" [(ngModel)]="rawData" (ngModelChange)="result.set(null)"
          rows="11" [placeholder]="placeholder()" spellcheck="false"></textarea>
      </div>
    }

    <!-- ── Progress during import ── -->
    @if (importing()) {
      <div class="card" style="margin-bottom:16px">
        <div style="font-size:13px;font-weight:500;margin-bottom:8px">Importing {{ importTotal() }} items...</div>
        <div class="progress-bar">
          <div class="progress-fill" [style.width]="importPct() + '%'"></div>
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:6px">{{ importDone() }} / {{ importTotal() }} imported</div>
      </div>
    }

    <!-- ── Result ── -->
    @if (result()) {
      <div class="result-box" style="margin-bottom:16px">
        <div style="font-weight:700;color:#15803d;font-size:15px;margin-bottom:6px">
          ✓ {{ result()!.created }} items imported successfully!
        </div>
        <div style="font-size:13px;color:#166534;display:flex;gap:16px;flex-wrap:wrap">
          @if (result()!.detected) { <span>Format: <strong>{{ result()!.detected | uppercase }}</strong></span> }
          <span>Parsed: <strong>{{ result()!.parsed }}</strong></span>
          <span>Created: <strong>{{ result()!.created }}</strong></span>
          @if (result()!.failed) { <span style="color:#dc2626">Skipped: <strong>{{ result()!.failed }}</strong></span> }
        </div>
      </div>
    }

    @if (error()) {
      <div style="background:#fee2e2;color:#dc2626;padding:12px 16px;border-radius:8px;margin-bottom:16px;font-size:13px">
        <strong>Import failed:</strong> {{ error() }}
      </div>
    }

    <!-- ── Actions ── -->
    <div style="display:flex;gap:10px;align-items:center">
      @if (format() === 'sql-file') {
        <button class="btn btn-primary" type="button"
          [disabled]="importing() || !parsedItems().length"
          (click)="importSqlItems()">
          @if (importing()) { Importing… }
          @else { Import {{ parsedItems().length }} items }
        </button>
      } @else {
        <button class="btn btn-primary" type="button"
          [disabled]="importing() || !rawData.trim()"
          (click)="importRawData()">
          @if (importing()) { Importing… } @else { Import Data }
        </button>
      }
      @if (result()) {
        <a routerLink="/knowledge" class="btn btn-outline">View Knowledge Base →</a>
        <button class="btn btn-outline" (click)="reset()" type="button">Import More</button>
      }
    </div>
  `,
})
export class KnowledgeImportComponent {
  @ViewChild('sqlInput') sqlInputRef!: ElementRef<HTMLInputElement>;
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  readonly router = inject(Router);

  format = signal<Format>('sql-file');
  rawData = '';
  dragging = signal(false);
  sqlFile = signal<File | null>(null);
  parsing = signal(false);
  parsedItems = signal<ParsedItem[]>([]);
  detectedTables = signal<string[]>([]);
  parseWarnings = signal<string[]>([]);
  importing = signal(false);
  importDone = signal(0);
  importTotal = signal(0);
  importPct = signal(0);
  result = signal<{ created: number; failed: number; detected?: string; parsed: number } | null>(null);
  error = signal('');

  readonly formats = [
    { key: 'sql-file' as Format, label: 'SQL File Upload', icon: '🗄️' },
    { key: 'auto' as Format, label: 'Auto-detect',    icon: '🔍' },
    { key: 'csv'  as Format, label: 'CSV',            icon: '📊' },
    { key: 'sql'  as Format, label: 'SQL (paste)',    icon: '{ }' },
    { key: 'json' as Format, label: 'JSON',           icon: '[ ]' },
    { key: 'text' as Format, label: 'Plain Text',     icon: '📝' },
  ];

  get fileSize(): ReturnType<typeof signal<string>> {
    return signal(this.sqlFile()
      ? (this.sqlFile()!.size > 1048576
          ? `${(this.sqlFile()!.size/1048576).toFixed(1)} MB`
          : `${(this.sqlFile()!.size/1024).toFixed(0)} KB`)
      : '');
  }

  previewItems() { return this.parsedItems().slice(0, 5); }

  setFormat(f: Format) { this.format.set(f); this.error.set(''); this.result.set(null); }

  loadSample(f: string) {
    this.rawData = SAMPLES[f] ?? '';
    this.format.set(f as Format);
    this.result.set(null);
  }

  placeholder(): string {
    const f = this.format();
    if (f === 'csv')  return 'title,content,category\n"Item Title","Full description","category-name"';
    if (f === 'sql')  return 'INSERT INTO table (title, content) VALUES\n(\'Item\', \'Description\');';
    if (f === 'json') return '[{"title":"Item","content":"Description","category":"general"}]';
    if (f === 'text') return 'First paragraph becomes item 1 title.\n\nSecond paragraph becomes item 2...';
    return 'Paste any data — CSV, SQL INSERT, JSON, or plain text. Format auto-detected.';
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) this.processFile(file);
  }

  onFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.processFile(file);
  }

  processFile(file: File) {
    this.sqlFile.set(file);
    this.parsing.set(true);
    this.parsedItems.set([]);
    this.detectedTables.set([]);
    this.parseWarnings.set([]);
    this.result.set(null);
    this.error.set('');

    const reader = new FileReader();
    reader.onload = (e) => {
      const raw = e.target?.result as string;
      const { items, tables } = parseSqlFile(raw);
      this.detectedTables.set(tables);
      this.parsedItems.set(items);
      this.parseWarnings.set([]); // could track skipped rows
      this.parsing.set(false);
      if (items.length === 0) {
        this.error.set('No records extracted. Check the SQL contains INSERT INTO statements with data.');
      } else {
        this.toast.show(`Parsed ${items.length} records from ${tables.length} table(s)`, 'success');
      }
    };
    reader.onerror = () => { this.parsing.set(false); this.error.set('Failed to read file.'); };
    // Read as binary string so we can fix the encoding
    reader.readAsBinaryString(file);
  }

  resetFile() {
    this.sqlFile.set(null);
    this.parsedItems.set([]);
    this.detectedTables.set([]);
    this.result.set(null);
    this.error.set('');
  }

  async importSqlItems() {
    const items = this.parsedItems();
    if (!items.length) return;
    this.importing.set(true);
    this.importDone.set(0);
    this.importTotal.set(items.length);
    this.importPct.set(0);
    this.error.set('');
    this.result.set(null);

    const BATCH = 20;
    let created = 0, failed = 0;

    try {
      for (let i = 0; i < items.length; i += BATCH) {
        const batch = items.slice(i, i + BATCH);
        const res = await firstValueFrom(
          this.api.post<{ created: number; failed: number; detected: string; parsed: number }>(
            'knowledge/import', { data: JSON.stringify(batch), format: 'json' }
          )
        );
        created += res.created ?? batch.length;
        failed  += res.failed  ?? 0;
        this.importDone.set(created);
        this.importPct.set(Math.round(((i + BATCH) / items.length) * 100));
      }
      this.result.set({ created, failed, detected: 'sql', parsed: items.length });
      this.toast.success(`✓ ${created} items imported from ${this.sqlFile()?.name ?? 'SQL file'}`);
    } catch (e: any) {
      this.error.set(e?.error?.message ?? 'Import failed');
    } finally {
      this.importing.set(false);
    }
  }

  async importRawData() {
    if (!this.rawData.trim()) return;
    this.importing.set(true);
    this.error.set('');
    this.result.set(null);

    let data = this.rawData;
    let format: string = this.format();

    if (format === 'text') {
      const paragraphs = data.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 20);
      data = JSON.stringify(paragraphs.map(p => ({
        title: p.split('\n')[0].slice(0, 120).replace(/[.!?]$/, ''),
        content: p, category: 'general',
      })));
      format = 'json';
    }

    try {
      const res = await firstValueFrom(
        this.api.post<{ created: number; failed: number; detected: string; parsed: number }>(
          'knowledge/import', { data, format }
        )
      );
      this.result.set(res);
      this.toast.success(`✓ ${res.created} items imported`);
    } catch (e: any) {
      this.error.set(e?.error?.message ?? 'Import failed. Check your data format.');
    } finally {
      this.importing.set(false);
    }
  }

  reset() {
    this.rawData = '';
    this.sqlFile.set(null);
    this.parsedItems.set([]);
    this.result.set(null);
    this.error.set('');
  }
}
