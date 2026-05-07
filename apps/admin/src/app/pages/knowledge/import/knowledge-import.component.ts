import { Component, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { firstValueFrom } from 'rxjs';

type Format = 'sql-file' | 'auto' | 'csv' | 'sql' | 'json' | 'text';

interface ParsedItem {
  title: string; content: string; summary?: string; category: string;
  tags: string[]; metadata?: Record<string, unknown>; source: string; isActive: boolean;
}

// ─── Encoding + HTML helpers ──────────────────────────────────────────────────
function fixEncoding(s: string): string {
  if (!s) return '';
  try {
    const b = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 0xff;
    return new TextDecoder('utf-8', { fatal: false }).decode(b);
  } catch { return s; }
}

function stripHtml(h: string): string {
  return (h || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/?p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

// ─── Category code map (Catania CCP) ──────────────────────────────────────────
const CC: Record<string, string> = {
  '001':'culture','002':'culture','003':'culture','004':'city-tour','005':'entertainment',
  '006':'shopping','007':'food','008':'transport','009':'nature','010':'healthcare',
  '011':'safety','012':'children','044':'children','045':'culture','051':'culture',
  '052':'entertainment','053':'food','054':'culture','055':'shopping',
};

// ─── Generic column alias map ──────────────────────────────────────────────────
const FM: Record<string, string> = {
  titolo:'title',title:'title',name:'title',nome:'title',subject:'title',
  question:'title',heading:'title',label:'title',
  descrizione:'content',description:'content',content:'content',body:'content',
  testo:'content',text:'content',details:'content',answer:'content',
  summary:'summary',excerpt:'summary',abstract:'summary',short_description:'summary',
  categorie:'category',category:'category',tipo:'category',type:'category',
  group:'category',settore:'category',tags:'tags',keywords:'tags',
};

// ─── SQL parser ───────────────────────────────────────────────────────────────
function parseRows(v: string): string[][] {
  const rows: string[][] = []; let buf = '', depth = 0, inStr = false, q = '';
  for (let i = 0; i < v.length; i++) {
    const ch = v[i];
    if (!inStr) {
      if (ch === "'" || ch === '"') { inStr = true; q = ch; }
      else if (ch === '(') { if (depth++ === 0) buf = ''; else buf += ch; }
      else if (ch === ')') { if (--depth === 0) { rows.push(splitV(buf)); buf = ''; } else buf += ch; }
      else if (depth > 0) buf += ch;
    } else {
      if (ch === q && v[i-1] !== '\\') inStr = false;
      else if (ch === '\\' && (v[i+1] === q || v[i+1] === '\\')) buf += v[++i];
      else buf += ch;
    }
  }
  return rows;
}

function splitV(row: string): string[] {
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
  vals.push(cur.trim()); return vals;
}

function parseSqlFile(sql: string): { byTable: Record<string, ParsedItem[]>; tables: string[] } {
  const byTable: Record<string, ParsedItem[]> = {};
  const tables: string[] = [];
  const push = (t: string, item: ParsedItem) => { if (!byTable[t]) byTable[t] = []; byTable[t].push(item); };

  const re = /INSERT INTO\s+[`"']?(\w+)[`"']?\s*\(([^)]+)\)\s*VALUES([\s\S]+?);(?=\s*(?:INSERT|CREATE|DROP|ALTER|--|\/\*|$))/gim;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql)) !== null) {
    const tbl = m[1].toLowerCase();
    if (!tables.includes(tbl)) tables.push(tbl);
    const cols = m[2].split(',').map(c => c.trim().replace(/[`"']/g, '').toLowerCase());
    for (const row of parseRows(m[3])) {
      const o: Record<string, string> = {};
      cols.forEach((c, i) => { o[c] = row[i] || ''; });
      if (o['flag_cancellato'] === '1' || o['deleted'] === '1') continue;

      // Catania attrazioni
      if (tbl === 'attrazioni') {
        const title = fixEncoding(o['titolo'] || '').trim();
        const content = stripHtml(fixEncoding(o['descrizione'] || ''));
        if (!title || content.length < 10) continue;
        push(tbl, {
          title, content, summary: content.split('\n')[0].slice(0, 200),
          category: (o['categorie'] || '').split('|').map(c => CC[c.trim()]).find(Boolean) || 'culture',
          tags: ['catania','sicily','city-pass',...(o['flag_glutenfree']==='1'?['gluten-free']:[]),...(o['flag_vegana']==='1'?['vegan']:[])],
          metadata: { address: fixEncoding(o['indirizzo']||''), lat: parseFloat(o['latitudine'])||null, lng: parseFloat(o['longitudine'])||null, phone: o['cellulare']||'', website: o['url']||'' },
          source: 'sql', isActive: true,
        }); continue;
      }
      // Catania attivita_commerciali
      if (tbl === 'attivita_commerciali') {
        const name = fixEncoding(o['ragione_sociale'] || '').trim();
        if (!name) continue;
        push(tbl, {
          title: name,
          content: [o['indirizzo']?`Address: ${fixEncoding(o['indirizzo'])}, Catania`:'', o['cellulare']?`Phone: ${o['cellulare']}`:'', o['email']?`Email: ${o['email']}`:'', o['url']?`Website: ${o['url']}`:''].filter(Boolean).join('\n') || name,
          summary: `${name} — Catania City Pass partner`,
          category: o['flag_farmacia']==='1'?'healthcare': o['flag_cinema']==='1'||o['flag_teatro']==='1'?'entertainment':'shopping',
          tags: ['catania','city-pass','partner'],
          metadata: { address: fixEncoding(o['indirizzo']||'') }, source: 'sql', isActive: true,
        }); continue;
      }
      // Generic
      let title='', content='', summary='', category='general';
      const tags: string[] = []; const meta: Record<string, unknown> = {};
      for (const [col, val] of Object.entries(o)) {
        if (!val) continue;
        const fval = fixEncoding(val); const target = FM[col];
        if (target==='title') title=fval; else if (target==='content') content=stripHtml(fval);
        else if (target==='summary') summary=fval; else if (target==='category') category=fval;
        else if (target==='tags') tags.push(...fval.split(/[,;|]/));
        else meta[col]=fval;
      }
      if (!title) title = fixEncoding(Object.values(o).find(v=>v&&v.length>1)||'');
      if (!content) content=title;
      if (!title||!content) continue;
      if (/^\d+$/.test(title.trim())) continue;
      if (title.trim().length < 3) continue;
      if (content.trim().length < 10) continue;
      if (content.trim() === title.trim()) continue;
      push(tbl, { title, content, summary, category, tags, metadata: meta, source:'sql', isActive:true });
    }
  }
  return { byTable, tables };
}

// ─── Samples ──────────────────────────────────────────────────────────────────
const SAMPLES: Record<string, string> = {
  csv: `title,content,category,tags\n"Catania Cathedral","Baroque masterpiece in Piazza del Duomo rebuilt after 1693 earthquake.","culture","baroque,history"\n"Mount Etna","Europe highest active volcano at 3350m. Guided tours available.","nature","volcano,hiking"`,
  sql: `INSERT INTO knowledge (title, content, category) VALUES\n('Return Policy','Items returned within 30 days with receipt.','policy'),\n('Shipping','Standard 3-5 days. Express 1-2 days.','shipping');`,
  json: `[{"title":"Warranty","content":"All products include 1-year warranty.","category":"support"},\n{"name":"Contact","description":"support@company.com or 1-800-HELP.","type":"contact"}]`,
  text: `Our company provides three service tiers.\n\nThe Basic plan includes 5 users for $29/month.\n\nEnterprise offers unlimited users with custom pricing.`,
};

// ─── Component ────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-knowledge-import',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  styles: [`
    .tab { padding: 8px 16px; border-radius: 8px 8px 0 0; border: 1.5px solid var(--border); border-bottom: none; background: var(--bg); cursor: pointer; font-size: 13px; font-weight: 500; color: var(--text-muted); transition: all .15s; white-space: nowrap; }
    .tab.active { background: var(--primary); color: #fff; border-color: var(--primary); }
    .drop-zone { border: 2.5px dashed var(--border); border-radius: 12px; padding: 48px 24px; text-align: center; cursor: pointer; transition: all .2s; background: #fafafa; }
    .drop-zone:hover, .drop-zone.over { border-color: var(--primary); background: #eff6ff; }
    .tbl-card { border: 1.5px solid var(--border); border-radius: 10px; padding: 14px 16px; cursor: pointer; transition: all .15s; display: flex; align-items: center; gap: 12px; }
    .tbl-card.selected { border-color: var(--primary); background: #eff6ff; }
    .tbl-card:hover:not(.selected) { border-color: #94a3b8; }
    .preview-table { font-size: 12px; border-collapse: collapse; width: 100%; }
    .preview-table th { background: var(--bg); font-weight: 600; text-align: left; padding: 6px 10px; border-bottom: 1px solid var(--border); font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted); }
    .preview-table td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    .data-area { width: 100%; font-family: monospace; font-size: 12.5px; border: 1.5px solid var(--border); border-radius: 8px; padding: 14px; resize: vertical; line-height: 1.6; box-sizing: border-box; }
    .progress-bar { height: 8px; background: var(--border); border-radius: 4px; overflow: hidden; }
    .progress-fill { height: 100%; background: var(--primary); border-radius: 4px; transition: width .3s; }
    .result-box { background: #f0fdf4; border: 1px solid #86efac; border-radius: 10px; padding: 16px; }
    .step-badge { width: 22px; height: 22px; border-radius: 50%; background: var(--primary); color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .hint { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 12px 16px; font-size: 13px; }
  `],
  template: `
    <div class="page-header">
      <h1 class="page-title">Import Data into Knowledge Base</h1>
      <a routerLink="/knowledge" class="btn btn-outline">← Knowledge Base</a>
    </div>

    <!-- Quick guide -->
    <div class="card" style="margin-bottom:16px;background:linear-gradient(135deg,#eff6ff,#f0fdf4);border-color:#bfdbfe">
      <div class="card-title" style="color:#1e40af">3 steps to import any data</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px">
        <div style="display:flex;gap:8px"><span class="step-badge">1</span><div><strong>Pick method</strong><br><span style="font-size:12px;color:var(--text-muted)">Drop SQL file or paste CSV/JSON/text</span></div></div>
        <div style="display:flex;gap:8px"><span class="step-badge">2</span><div><strong>Select tables</strong><br><span style="font-size:12px;color:var(--text-muted)">Choose which tables to import from SQL</span></div></div>
        <div style="display:flex;gap:8px"><span class="step-badge">3</span><div><strong>Import</strong><br><span style="font-size:12px;color:var(--text-muted)">Bot learns from the data immediately</span></div></div>
      </div>
    </div>

    <!-- Tabs -->
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;border-bottom:2px solid var(--border);padding-bottom:12px">
      @for (f of formats; track f.key) {
        <button class="tab" [class.active]="format()===f.key" (click)="format.set(f.key);error.set('');result.set(null)" type="button">
          {{ f.icon }} {{ f.label }}
        </button>
      }
    </div>

    <!-- ── SQL FILE UPLOAD ── -->
    @if (format() === 'sql-file') {
      <div class="card" style="margin-bottom:16px">
        <div class="card-title">Drop your SQL database file</div>
        <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px">
          Supports phpMyAdmin, mysqldump, MySQL Workbench exports. Any file size.
          Auto-detects <strong>attrazioni</strong>, <strong>attivita_commerciali</strong>, and any other table.
        </p>

        @if (!sqlFile()) {
          <div class="drop-zone" [class.over]="dragging()"
            (dragover)="$event.preventDefault();dragging.set(true)"
            (dragleave)="dragging.set(false)" (drop)="onDrop($event)"
            (click)="fileInput.click()">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" style="margin:0 auto 12px;display:block">
              <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 12V4M8 8l4-4 4 4"/></svg>
            <div style="font-size:15px;font-weight:600;color:#1e293b;margin-bottom:4px">Drop your .sql file here</div>
            <div style="font-size:13px;color:var(--text-muted);margin-bottom:12px">or click to browse</div>
            <div style="font-size:11px;color:#94a3b8">Supports phpMyAdmin · mysqldump · MySQL Workbench</div>
          </div>
          <input #fileInput type="file" accept=".sql,text/plain" style="display:none" (change)="onFileChange($event)" />
        } @else {
          <!-- File loaded -->
          <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px 16px;display:flex;align-items:center;gap:10px;margin-bottom:16px">
            <span style="font-size:20px">📄</span>
            <div style="flex:1">
              <div style="font-weight:600">{{ sqlFile()!.name }}</div>
              <div style="font-size:12px;color:var(--text-muted)">
                {{ fileSizeLabel() }} · {{ tables().length }} table(s) found · {{ totalParsedCount() }} records extracted
              </div>
            </div>
            <button class="btn btn-outline btn-sm" (click)="resetFile()" type="button">Change file</button>
          </div>

          @if (parsing()) {
            <div style="margin-bottom:16px">
              <div style="font-size:13px;color:var(--text-muted);margin-bottom:6px">Parsing SQL file…</div>
              <div class="progress-bar"><div class="progress-fill" style="width:70%"></div></div>
            </div>
          }

          <!-- TABLE SELECTION -->
          @if (tables().length && !parsing()) {
            <div style="margin-bottom:16px">
              <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">
                Select tables to import
              </div>
              <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px">
                @for (tbl of tables(); track tbl) {
                  <div class="tbl-card" [class.selected]="selectedTables()[tbl]"
                    (click)="toggleTable(tbl)">
                    <input type="checkbox" [checked]="selectedTables()[tbl]"
                      (click)="$event.stopPropagation();toggleTable(tbl)"
                      style="width:16px;height:16px;cursor:pointer" />
                    <div>
                      <div style="font-family:monospace;font-weight:600;font-size:13px">{{ tbl }}</div>
                      <div style="font-size:11px;color:var(--text-muted)">{{ tableCount(tbl) }} records</div>
                    </div>
                    @if (isCataniaTable(tbl)) {
                      <span class="badge badge-blue" style="font-size:10px;margin-left:auto">Catania</span>
                    }
                  </div>
                }
              </div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:8px">
                {{ selectedCount() }} records from {{ selectedTableCount() }} table(s) selected for import
              </div>
            </div>

            <!-- Preview -->
            @if (selectedCount() > 0) {
              <div style="margin-bottom:14px">
                <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">
                  Preview (first 5 of {{ selectedCount() }} records)
                </div>
                <div style="overflow-x:auto;border:1px solid var(--border);border-radius:8px">
                  <table class="preview-table">
                    <thead><tr><th>#</th><th>Title</th><th>Category</th><th>Content snippet</th><th>Table</th></tr></thead>
                    <tbody>
                      @for (item of previewItems(); track $index) {
                        <tr>
                          <td style="color:var(--text-muted)">{{ $index+1 }}</td>
                          <td style="font-weight:500;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ item.item.title }}</td>
                          <td><span class="badge badge-blue" style="font-size:10px">{{ item.item.category }}</span></td>
                          <td style="color:var(--text-muted);max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ item.item.content.slice(0,80) }}</td>
                          <td style="font-family:monospace;font-size:11px;color:var(--text-muted)">{{ item.table }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
                @if (selectedCount() > 5) {
                  <div style="font-size:12px;color:var(--text-muted);padding:6px 10px">+ {{ selectedCount()-5 }} more records</div>
                }
              </div>
            }
          }
        }
      </div>
    }

    <!-- ── PASTE FORMATS ── -->
    @if (format() !== 'sql-file') {
      <div class="card" style="margin-bottom:16px">
        <div class="hint" style="margin-bottom:14px">
          @if (format()==='auto') { <strong>Auto-detect:</strong> Paste CSV, SQL INSERT, JSON array, or plain text paragraphs. }
          @if (format()==='csv') { <strong>CSV:</strong> First row = column headers. title, content, category, tags columns. }
          @if (format()==='sql') { <strong>SQL INSERT:</strong> Paste INSERT INTO statements. Column names auto-mapped. }
          @if (format()==='json') { <strong>JSON:</strong> Array <code>[&#123;...&#125;]</code> or &#123;"data":[...]&#125;. Any field names work. }
          @if (format()==='text') { <strong>Plain text:</strong> Each paragraph becomes one knowledge item. }
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
          <span style="font-size:12px;color:var(--text-muted)">Load sample:</span>
          @for (f of formats.slice(1); track f.key) {
            @if (f.key !== 'sql-file') {
              <button class="btn btn-outline btn-sm" (click)="rawData=SAMPLES[f.key]||'';result.set(null)" type="button">{{ f.icon }} {{ f.label }}</button>
            }
          }
        </div>
        <textarea class="data-area" [(ngModel)]="rawData" (ngModelChange)="result.set(null)" rows="11"
          [placeholder]="pastePlaceholder()" spellcheck="false"></textarea>
      </div>
    }

    <!-- Progress -->
    @if (importing()) {
      <div class="card" style="margin-bottom:16px">
        <div style="font-size:13px;font-weight:500;margin-bottom:8px">Importing {{ importTotal() }} items…</div>
        <div class="progress-bar"><div class="progress-fill" [style.width]="importPct()+'%'"></div></div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:6px">{{ importDone() }} / {{ importTotal() }} imported</div>
      </div>
    }

    <!-- Result -->
    @if (result()) {
      <div class="result-box" style="margin-bottom:16px">
        <div style="font-weight:700;color:#15803d;font-size:15px;margin-bottom:6px">✓ {{ result()!.created }} items imported!</div>
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

    <!-- Actions -->
    <div style="display:flex;gap:10px;align-items:center">
      @if (format() === 'sql-file') {
        <button class="btn btn-primary" type="button" [disabled]="importing()||selectedCount()===0" (click)="importSqlItems()">
          {{ importing() ? 'Importing…' : 'Import ' + selectedCount() + ' Records' }}
        </button>
      } @else {
        <button class="btn btn-primary" type="button" [disabled]="importing()||!rawData.trim()" (click)="importRaw()">
          {{ importing() ? 'Importing…' : 'Import Data' }}
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
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly SAMPLES = SAMPLES;
  format = signal<Format>('sql-file');
  rawData = '';
  dragging = signal(false);
  sqlFile = signal<File | null>(null);
  parsing = signal(false);
  byTable = signal<Record<string, ParsedItem[]>>({});
  tables = signal<string[]>([]);
  selectedTables = signal<Record<string, boolean>>({});
  importing = signal(false);
  importDone = signal(0);
  importTotal = signal(0);
  importPct = signal(0);
  result = signal<{ created: number; failed: number; detected?: string; parsed: number } | null>(null);
  error = signal('');

  readonly formats = [
    { key: 'sql-file' as Format, label: 'SQL File Upload', icon: '🗄️' },
    { key: 'auto'     as Format, label: 'Auto-detect',    icon: '🔍' },
    { key: 'csv'      as Format, label: 'CSV',            icon: '📊' },
    { key: 'sql'      as Format, label: 'SQL (paste)',    icon: '{ }' },
    { key: 'json'     as Format, label: 'JSON',           icon: '[ ]' },
    { key: 'text'     as Format, label: 'Plain Text',     icon: '📝' },
  ];

  fileSizeLabel(): string {
    const f = this.sqlFile();
    if (!f) return '';
    return f.size > 1048576 ? `${(f.size/1048576).toFixed(1)} MB` : `${(f.size/1024).toFixed(0)} KB`;
  }

  totalParsedCount(): number { return Object.values(this.byTable()).reduce((s, a) => s + a.length, 0); }
  tableCount(t: string): number { return this.byTable()[t]?.length ?? 0; }
  isCataniaTable(t: string): boolean { return ['attrazioni','attivita_commerciali'].includes(t); }

  selectedTableCount(): number { return Object.values(this.selectedTables()).filter(Boolean).length; }
  selectedCount(): number {
    return this.tables().filter(t => this.selectedTables()[t]).reduce((s, t) => s + this.tableCount(t), 0);
  }

  previewItems(): { table: string; item: ParsedItem }[] {
    const out: { table: string; item: ParsedItem }[] = [];
    for (const t of this.tables()) {
      if (!this.selectedTables()[t]) continue;
      for (const item of (this.byTable()[t] ?? []).slice(0, 5)) {
        out.push({ table: t, item });
        if (out.length >= 5) return out;
      }
    }
    return out;
  }

  toggleTable(t: string) {
    this.selectedTables.update(s => ({ ...s, [t]: !s[t] }));
  }

  pastePlaceholder(): string {
    const f = this.format();
    if (f === 'csv') return 'title,content,category\n"Item Title","Full description","category-name"';
    if (f === 'sql') return 'INSERT INTO table (title, content) VALUES\n(\'Item\', \'Description\');';
    if (f === 'json') return '[{"title":"Item","content":"Description","category":"general"}]';
    if (f === 'text') return 'First paragraph is item 1.\n\nSecond paragraph is item 2...';
    return 'Paste CSV, SQL INSERT, JSON, or plain text — format auto-detected.';
  }

  onDrop(e: DragEvent) {
    e.preventDefault(); this.dragging.set(false);
    const f = e.dataTransfer?.files[0]; if (f) this.processFile(f);
  }
  onFileChange(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0]; if (f) this.processFile(f);
  }

  processFile(file: File) {
    this.sqlFile.set(file); this.parsing.set(true);
    this.byTable.set({}); this.tables.set([]); this.selectedTables.set({});
    this.result.set(null); this.error.set('');
    const reader = new FileReader();
    reader.onload = (e) => {
      const raw = e.target?.result as string;
      const { byTable, tables } = parseSqlFile(raw);
      this.byTable.set(byTable); this.tables.set(tables);
      // Auto-select all tables
      const sel: Record<string, boolean> = {};
      tables.forEach(t => { sel[t] = true; });
      this.selectedTables.set(sel);
      this.parsing.set(false);
      const total = Object.values(byTable).reduce((s, a) => s + a.length, 0);
      if (total === 0) this.error.set('No records found. Check the SQL contains INSERT INTO statements.');
      else this.toast.show(`Parsed ${total} records from ${tables.length} table(s)`, 'success');
    };
    reader.onerror = () => { this.parsing.set(false); this.error.set('Failed to read file.'); };
    reader.readAsBinaryString(file);
  }

  resetFile() { this.sqlFile.set(null); this.byTable.set({}); this.tables.set([]); this.selectedTables.set({}); this.result.set(null); this.error.set(''); }

  async importSqlItems() {
    const allItems: ParsedItem[] = [];
    for (const t of this.tables()) {
      if (this.selectedTables()[t]) allItems.push(...(this.byTable()[t] ?? []));
    }
    if (!allItems.length) return;
    this.importing.set(true); this.importDone.set(0); this.importTotal.set(allItems.length); this.importPct.set(0);
    this.error.set(''); this.result.set(null);
    let created = 0, failed = 0;
    const BATCH = 20;
    try {
      for (let i = 0; i < allItems.length; i += BATCH) {
        const batch = allItems.slice(i, i + BATCH);
        const r = await firstValueFrom(this.api.post<any>('knowledge/import', { data: JSON.stringify(batch), format: 'json' }));
        created += r.created ?? batch.length; failed += r.failed ?? 0;
        this.importDone.set(created); this.importPct.set(Math.round(((i + BATCH) / allItems.length) * 100));
      }
      this.result.set({ created, failed, detected: 'sql', parsed: allItems.length });
      this.toast.success(`✓ ${created} items imported from ${this.sqlFile()?.name ?? 'SQL'}`);
    } catch (e: any) { this.error.set(e?.error?.message ?? 'Import failed'); }
    finally { this.importing.set(false); }
  }

  async importRaw() {
    if (!this.rawData.trim()) return;
    this.importing.set(true); this.error.set(''); this.result.set(null);
    let data = this.rawData; let format: string = this.format();
    if (format === 'text') {
      const pars = data.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 20);
      data = JSON.stringify(pars.map(p => ({ title: p.split('\n')[0].slice(0, 120).replace(/[.!?]$/, ''), content: p, category: 'general' })));
      format = 'json';
    }
    try {
      const r = await firstValueFrom(this.api.post<any>('knowledge/import', { data, format }));
      this.result.set(r); this.toast.success(`✓ ${r.created} items imported`);
    } catch (e: any) { this.error.set(e?.error?.message ?? 'Import failed. Check your data format.'); }
    finally { this.importing.set(false); }
  }

  reset() { this.rawData = ''; this.sqlFile.set(null); this.byTable.set({}); this.tables.set([]); this.selectedTables.set({}); this.result.set(null); this.error.set(''); }
}
