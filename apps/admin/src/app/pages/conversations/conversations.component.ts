import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';

interface ConvRow { sessionId: string; currentState: string; language: string; isActive: boolean; lastMessageAt: string; createdAt: string; collectedParams: Record<string, unknown>; }
interface ConvDetail { sessionId: string; messages: { role: string; content: string; timestamp: string }[]; }

@Component({
  selector: 'app-conversations',
  standalone: true,
  imports: [CommonModule],
  styles: [`.thread { border-top: 1px solid var(--border); margin-top: 16px; padding-top: 16px; } .msg { margin-bottom: 12px; } .msg-role { font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-muted); margin-bottom: 4px; } .msg-content { background: var(--bg); padding: 10px 14px; border-radius: 8px; font-size: 13px; line-height: 1.6; white-space: pre-wrap; } .msg.assistant .msg-content { background: #eff6ff; color: #1e40af; }`],
  template: `
    <div class="page-header">
      <h1 class="page-title">Conversations ({{ total() }})</h1>
    </div>

    <div style="display:grid;grid-template-columns:1fr 380px;gap:20px;align-items:start">
      <div>
        @if (loading()) { <div class="loading"><div class="spinner"></div></div> }
        @else {
          <div class="card" style="padding:0;overflow:hidden">
            <table>
              <thead><tr><th>Session</th><th>State</th><th>Lang</th><th>Status</th><th>Started</th></tr></thead>
              <tbody>
                @for (c of rows(); track c.sessionId) {
                  <tr (click)="select(c)" style="cursor:pointer" [style.background]="selected()?.sessionId===c.sessionId?'#eff6ff':''">
                    <td style="font-family:monospace;font-size:12px">{{ c.sessionId }}</td>
                    <td><span class="badge badge-gray">{{ c.currentState }}</span></td>
                    <td>{{ c.language | uppercase }}</td>
                    <td><span class="badge" [class]="c.isActive?'badge-green':'badge-gray'">{{ c.isActive?'Active':'Ended' }}</span></td>
                    <td style="color:var(--text-muted);font-size:12px">{{ c.createdAt | date:'short' }}</td>
                  </tr>
                }
              </tbody>
            </table>
            @if (!rows().length) { <div class="empty-state"><h3>No conversations yet</h3></div> }
          </div>
          <div class="pagination">
            <button class="btn btn-outline btn-sm" [disabled]="page()===1" (click)="go(page()-1)">←</button>
            <span>Page {{ page() }} of {{ pages() }}</span>
            <button class="btn btn-outline btn-sm" [disabled]="page()>=pages()" (click)="go(page()+1)">→</button>
          </div>
        }
      </div>

      <div class="card" style="position:sticky;top:24px">
        @if (!selected()) {
          <div class="empty-state" style="padding:32px"><h3>Select a conversation</h3><p>Click any row to view the full thread.</p></div>
        } @else {
          <div style="font-family:monospace;font-size:11px;color:var(--text-muted);margin-bottom:12px">{{ selected()!.sessionId }}</div>
          @if (detailLoading()) { <div class="loading" style="padding:24px"><div class="spinner"></div></div> }
          @else if (detail()) {
            <div class="thread">
              @for (m of detail()!.messages; track $index) {
                <div class="msg" [class]="m.role">
                  <div class="msg-role">{{ m.role }}</div>
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

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.get<{ items: ConvRow[]; total: number; pages: number }>('analytics/conversations', { page: this.page(), limit: 25 }).subscribe({
      next: (r) => { this.rows.set(r.items); this.total.set(r.total); this.pages.set(r.pages); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  go(p: number) { this.page.set(p); this.load(); }

  select(c: ConvRow) {
    this.selected.set(c);
    this.detail.set(null);
    this.detailLoading.set(true);
    this.api.get<ConvDetail>(`analytics/conversations/${c.sessionId}`).subscribe({
      next: (d) => { this.detail.set(d); this.detailLoading.set(false); },
      error: () => this.detailLoading.set(false),
    });
  }
}
