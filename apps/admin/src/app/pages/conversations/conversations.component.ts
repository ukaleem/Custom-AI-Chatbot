import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

interface ConvRow {
  sessionId: string; currentState: string; language: string; isActive: boolean;
  lastMessageAt: string; createdAt: string; collectedParams: Record<string, unknown>;
  messageCount: number; totalInputTokens: number; totalOutputTokens: number;
  totalTokens: number; modelUsed: string;
}
interface ConvDetail {
  sessionId: string; language: string; modelUsed: string;
  totalInputTokens: number; totalOutputTokens: number;
  messages: { role: string; content: string; timestamp: string; inputTokens: number; outputTokens: number; modelUsed: string; latencyMs: number }[];
}

@Component({
  selector: 'app-conversations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [DatePipe],
  styles: [`
    .thread { border-top: 1px solid var(--border); margin-top: 14px; padding-top: 14px; max-height: 460px; overflow-y: auto; }
    .msg { margin-bottom: 14px; }
    .msg-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .msg-role { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); }
    .msg-meta { font-size: 10px; color: var(--text-muted); }
    .msg-content { background: var(--bg); padding: 10px 14px; border-radius: 8px; font-size: 13px; line-height: 1.6; white-space: pre-wrap; }
    .msg.assistant .msg-content { background: #eff6ff; color: #1e40af; }
    .tok-pill { display: inline-flex; align-items: center; gap: 3px; background: #f1f5f9; border-radius: 4px; padding: 2px 6px; font-size: 10px; font-weight: 600; }
    .tok-in { color: #3b82f6; }
    .tok-out { color: #8b5cf6; }
    .filter-bar { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .sortable { cursor: pointer; user-select: none; }
    .sortable:hover { color: var(--primary); }
    .detail-stat { background: var(--bg); border-radius: 8px; padding: 10px 12px; text-align: center; }
    .detail-stat-val { font-size: 18px; font-weight: 700; }
    .detail-stat-lbl { font-size: 11px; color: var(--text-muted); }
    .progress-ring { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 4px; }
  `],
  template: `
    <div class="page-header">
      <h1 class="page-title">Conversations ({{ total() }})</h1>
    </div>

    <!-- Filters -->
    <div class="card" style="margin-bottom:14px;padding:12px 16px">
      <div class="filter-bar">
        <select class="form-control" style="max-width:130px" [(ngModel)]="filterLang" (change)="load()">
          <option value="">All Languages</option>
          <option value="en">English</option>
          <option value="it">Italiano</option>
          <option value="de">Deutsch</option>
          <option value="fr">Français</option>
          <option value="es">Español</option>
        </select>
        <select class="form-control" style="max-width:140px" [(ngModel)]="filterModel" (change)="load()">
          <option value="">All Models</option>
          <option value="gpt-4o">GPT-4o</option>
          <option value="gpt-4o-mini">GPT-4o Mini</option>
          <option value="claude-sonnet-4-6">Claude Sonnet</option>
          <option value="gemini-1.5-flash">Gemini Flash</option>
          <option value="mistral-large-latest">Mistral Large</option>
          <option value="demo">Demo Mode</option>
        </select>
        <select class="form-control" style="max-width:150px" [(ngModel)]="filterMinTokens" (change)="load()">
          <option value="">Min tokens: any</option>
          <option value="100">100+ tokens</option>
          <option value="500">500+ tokens</option>
          <option value="1000">1,000+ tokens</option>
          <option value="5000">5,000+ tokens</option>
        </select>
        <span style="font-size:12px;color:var(--text-muted);margin-left:4px">{{ rows().length }} shown</span>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 380px;gap:16px;align-items:start">
      <!-- Left: table -->
      <div>
        @if (loading()) { <div class="loading"><div class="spinner"></div></div> }
        @else {
          <div class="card" style="padding:0;overflow:hidden">
            <table>
              <thead>
                <tr>
                  <th>Session</th>
                  <th>State</th>
                  <th>Lang</th>
                  <th class="sortable" (click)="sortBy('messageCount')" title="Sort by messages">
                    Msgs {{ sortCol() === 'messageCount' ? (sortDir() === 1 ? '↑' : '↓') : '' }}
                  </th>
                  <th class="sortable" (click)="sortBy('totalTokens')" title="Sort by tokens">
                    Tokens {{ sortCol() === 'totalTokens' ? (sortDir() === 1 ? '↑' : '↓') : '' }}
                  </th>
                  <th>Model</th>
                  <th>Status</th>
                  <th>Started</th>
                </tr>
              </thead>
              <tbody>
                @for (c of sorted(); track c.sessionId) {
                  <tr (click)="select(c)" style="cursor:pointer" [style.background]="selected()?.sessionId===c.sessionId?'#eff6ff':''">
                    <td style="font-family:monospace;font-size:11px;max-width:120px;overflow:hidden;text-overflow:ellipsis">
                      {{ c.sessionId }}
                    </td>
                    <td><span class="badge badge-gray" style="font-size:10px">{{ c.currentState }}</span></td>
                    <td style="font-size:12px">{{ c.language | uppercase }}</td>
                    <td style="text-align:center;font-weight:500">{{ c.messageCount }}</td>
                    <td>
                      @if (c.totalTokens > 0) {
                        <div style="display:flex;gap:3px;align-items:center">
                          <span class="tok-pill tok-in">↑{{ c.totalInputTokens }}</span>
                          <span class="tok-pill tok-out">↓{{ c.totalOutputTokens }}</span>
                        </div>
                      } @else {
                        <span style="color:var(--text-muted);font-size:11px">—</span>
                      }
                    </td>
                    <td style="font-size:11px;max-width:100px;overflow:hidden;text-overflow:ellipsis;color:var(--text-muted)">
                      {{ c.modelUsed || '—' }}
                    </td>
                    <td>
                      <span class="progress-ring" [style.background]="c.isActive ? '#22c55e' : '#94a3b8'"></span>
                      <span style="font-size:12px">{{ c.isActive ? 'Active' : 'Ended' }}</span>
                    </td>
                    <td style="font-size:11px;color:var(--text-muted)">{{ c.createdAt | date:'MMM d, HH:mm' }}</td>
                  </tr>
                }
              </tbody>
            </table>
            @if (!rows().length) {
              <div class="empty-state"><h3>No conversations yet</h3></div>
            }
          </div>
          <div class="pagination">
            <button class="btn btn-outline btn-sm" [disabled]="page()===1" (click)="go(page()-1)">←</button>
            <span>Page {{ page() }} of {{ pages() }}</span>
            <button class="btn btn-outline btn-sm" [disabled]="page()>=pages()" (click)="go(page()+1)">→</button>
          </div>
        }
      </div>

      <!-- Right: detail panel -->
      <div class="card" style="position:sticky;top:24px">
        @if (!selected()) {
          <div class="empty-state" style="padding:32px 16px">
            <h3>Select a conversation</h3>
            <p>Click any row to view the full message thread with token details.</p>
          </div>
        } @else {
          <!-- Session meta -->
          <div style="font-family:monospace;font-size:10px;color:var(--text-muted);margin-bottom:10px;overflow:hidden;text-overflow:ellipsis">
            {{ selected()!.sessionId }}
          </div>

          @if (detailLoading()) {
            <div class="loading" style="padding:24px"><div class="spinner"></div></div>
          } @else if (detail()) {
            <!-- Token stats for this session -->
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px">
              <div class="detail-stat">
                <div class="detail-stat-val" style="color:#3b82f6">{{ detail()!.totalInputTokens | number }}</div>
                <div class="detail-stat-lbl">Input tokens</div>
              </div>
              <div class="detail-stat">
                <div class="detail-stat-val" style="color:#8b5cf6">{{ detail()!.totalOutputTokens | number }}</div>
                <div class="detail-stat-lbl">Output tokens</div>
              </div>
              <div class="detail-stat">
                <div class="detail-stat-val">{{ detail()!.messages.length }}</div>
                <div class="detail-stat-lbl">Messages</div>
              </div>
            </div>

            @if (detail()!.modelUsed) {
              <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">
                Model: <strong>{{ detail()!.modelUsed }}</strong> · Lang: <strong>{{ detail()!.language | uppercase }}</strong>
              </div>
            }

            <!-- Message thread -->
            <div class="thread">
              @for (m of detail()!.messages; track $index) {
                <div class="msg" [class]="m.role">
                  <div class="msg-header">
                    <span class="msg-role">{{ m.role }}</span>
                    <div style="display:flex;gap:4px;align-items:center">
                      @if (m.role === 'assistant' && m.outputTokens > 0) {
                        <span class="tok-pill tok-in">↑{{ m.inputTokens }}</span>
                        <span class="tok-pill tok-out">↓{{ m.outputTokens }}</span>
                        @if (m.latencyMs > 0) {
                          <span class="tok-pill" style="color:#64748b">{{ m.latencyMs }}ms</span>
                        }
                      }
                      <span class="msg-meta">{{ m.timestamp | date:'HH:mm:ss' }}</span>
                    </div>
                  </div>
                  <div class="msg-content">{{ m.content }}</div>
                </div>
              }
            </div>
          }
        }
      </div>
    </div>
  `,
})
export class ConversationsComponent implements OnInit {
  private readonly api = inject(ApiService);
  rows = signal<ConvRow[]>([]);
  total = signal(0);
  pages = signal(1);
  page = signal(1);
  loading = signal(true);
  selected = signal<ConvRow | null>(null);
  detail = signal<ConvDetail | null>(null);
  detailLoading = signal(false);
  filterLang = '';
  filterModel = '';
  filterMinTokens = '';
  sortCol = signal<string>('createdAt');
  sortDir = signal<number>(-1);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const params: Record<string, string | number> = { page: this.page(), limit: 25 };
    if (this.filterLang) params['language'] = this.filterLang;
    if (this.filterModel) params['model'] = this.filterModel;
    if (this.filterMinTokens) params['minTokens'] = this.filterMinTokens;

    this.api.get<{ items: ConvRow[]; total: number; pages: number }>('analytics/conversations', params).subscribe({
      next: r => { this.rows.set(r.items); this.total.set(r.total); this.pages.set(r.pages); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  go(p: number) { this.page.set(p); this.load(); }

  sortBy(col: string) {
    if (this.sortCol() === col) this.sortDir.update(d => -d);
    else { this.sortCol.set(col); this.sortDir.set(-1); }
  }

  sorted() {
    const col = this.sortCol() as keyof ConvRow;
    const dir = this.sortDir();
    return [...this.rows()].sort((a, b) => {
      const av = a[col] ?? 0;
      const bv = b[col] ?? 0;
      return av < bv ? -dir : av > bv ? dir : 0;
    });
  }

  select(c: ConvRow) {
    this.selected.set(c);
    this.detail.set(null);
    this.detailLoading.set(true);
    this.api.get<ConvDetail>(`analytics/conversations/${c.sessionId}`).subscribe({
      next: d => { this.detail.set(d); this.detailLoading.set(false); },
      error: () => this.detailLoading.set(false),
    });
  }
}
