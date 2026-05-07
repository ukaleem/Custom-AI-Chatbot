import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { firstValueFrom } from 'rxjs';

interface KItem {
  _id: string;
  title: string;
  category: string;
  source: string;
  isActive: boolean;
  createdAt: string;
  summary?: string;
  tags?: string[];
}

interface KBAnalytics {
  total: number;
  active: number;
  inactive: number;
  completeness: { withSummary: number; withTags: number; avgContentLength: number };
  byCategory: { category: string; count: number }[];
  bySource: { source: string; count: number }[];
  quality: { score: number; grade: string; gradeColor: string };
  suggestions: string[];
}

@Component({
  selector: 'app-knowledge-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  styles: [`
    .score-ring { width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 800; border: 5px solid; flex-shrink: 0; }
    .category-bar { height: 8px; border-radius: 4px; background: var(--primary); }
    .source-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-right: 6px; flex-shrink: 0; }
    .danger-zone { background: #fef2f2; border: 1px solid #fca5a5; border-radius: 10px; padding: 16px; }
    .suggestion-item { display: flex; align-items: flex-start; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
    .suggestion-item:last-child { border-bottom: none; }
  `],
  template: `
    <div class="page-header">
      <h1 class="page-title">Knowledge Base ({{ total() }})</h1>
      <div style="display:flex;gap:8px">
        <a routerLink="/knowledge/import" class="btn btn-outline">Import Data</a>
        <a routerLink="/knowledge/new" class="btn btn-primary">+ Add Item</a>
      </div>
    </div>

    <!-- ── Analytics panel ── -->
    @if (analytics()) {
      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <div class="card-title" style="margin:0">Knowledge Base Health</div>
          <button class="btn btn-outline btn-sm" (click)="loadAnalytics()" [disabled]="analyticsLoading()">
            {{ analyticsLoading() ? 'Refreshing…' : '↻ Refresh' }}
          </button>
        </div>

        <div style="display:grid;grid-template-columns:auto 1fr;gap:20px;align-items:start">
          <!-- Quality score ring -->
          <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
            <div class="score-ring" [style.borderColor]="analytics()!.quality.gradeColor" [style.color]="analytics()!.quality.gradeColor">
              {{ analytics()!.quality.score }}
            </div>
            <div style="font-size:12px;font-weight:700" [style.color]="analytics()!.quality.gradeColor">
              {{ analytics()!.quality.grade }}
            </div>
            <div style="font-size:10px;color:var(--text-muted)">Quality Score</div>
          </div>

          <div>
            <!-- Stats row -->
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">
              <div style="background:var(--bg);border-radius:8px;padding:10px;text-align:center">
                <div style="font-size:18px;font-weight:700">{{ analytics()!.total }}</div>
                <div style="font-size:11px;color:var(--text-muted)">Total Items</div>
              </div>
              <div style="background:var(--bg);border-radius:8px;padding:10px;text-align:center">
                <div style="font-size:18px;font-weight:700;color:#16a34a">{{ analytics()!.active }}</div>
                <div style="font-size:11px;color:var(--text-muted)">Active</div>
              </div>
              <div style="background:var(--bg);border-radius:8px;padding:10px;text-align:center">
                <div style="font-size:18px;font-weight:700;color:#2563eb">{{ analytics()!.completeness.withSummary }}</div>
                <div style="font-size:11px;color:var(--text-muted)">Have Summary</div>
              </div>
              <div style="background:var(--bg);border-radius:8px;padding:10px;text-align:center">
                <div style="font-size:18px;font-weight:700">{{ analytics()!.completeness.avgContentLength }}</div>
                <div style="font-size:11px;color:var(--text-muted)">Avg. Content Chars</div>
              </div>
            </div>

            <!-- Category breakdown -->
            @if (analytics()!.byCategory.length) {
              <div style="margin-bottom:12px">
                <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">By Category</div>
                <div style="display:flex;flex-direction:column;gap:5px">
                  @for (c of analytics()!.byCategory; track c.category) {
                    <div style="display:flex;align-items:center;gap:8px">
                      <span style="width:90px;font-size:12px;font-weight:500;text-overflow:ellipsis;overflow:hidden;white-space:nowrap">{{ c.category }}</span>
                      <div style="flex:1;background:var(--border);border-radius:3px;height:6px;overflow:hidden">
                        <div class="category-bar" [style.width]="catPct(c.count) + '%'"></div>
                      </div>
                      <span style="font-size:12px;color:var(--text-muted);width:24px;text-align:right">{{ c.count }}</span>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Sources -->
            @if (analytics()!.bySource.length) {
              <div style="display:flex;gap:12px;flex-wrap:wrap">
                @for (s of analytics()!.bySource; track s.source) {
                  <span style="font-size:12px;color:var(--text-muted)">
                    <span class="source-dot" [style.background]="srcColor(s.source)"></span>
                    {{ s.source }}: <strong>{{ s.count }}</strong>
                  </span>
                }
              </div>
            }
          </div>
        </div>

        <!-- Suggestions -->
        @if (analytics()!.suggestions.length) {
          <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border)">
            <div style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">
              Improvement suggestions
            </div>
            @for (s of analytics()!.suggestions; track $index) {
              <div class="suggestion-item">
                <span style="color:#d97706;font-size:14px">⚠</span>
                <span>{{ s }}</span>
              </div>
            }
          </div>
        } @else {
          <div style="margin-top:12px;padding:10px 14px;background:#f0fdf4;border-radius:8px;font-size:13px;color:#15803d">
            ✓ Knowledge base looks great! The bot has solid training data.
          </div>
        }
      </div>
    }

    <!-- ── Filter + Search ── -->
    <div class="card" style="margin-bottom:14px;padding:12px 16px">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
        <input class="form-control" style="max-width:240px" placeholder="Search title, content…"
          [(ngModel)]="search" (input)="onSearch()" />
        <select class="form-control" style="max-width:150px" [(ngModel)]="categoryFilter" (change)="onSearch()">
          <option value="">All Categories</option>
          @for (c of categories(); track c) { <option [value]="c">{{ c }}</option> }
        </select>
        <span style="font-size:13px;color:var(--text-muted)">{{ total() | number }} items</span>
      </div>
    </div>

    <!-- ── Table ── -->
    @if (loading()) {
      <div class="loading"><div class="spinner"></div></div>
    } @else {
      <div class="card" style="padding:0;overflow:hidden;margin-bottom:16px">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Source</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (item of items(); track item._id) {
              <tr>
                <td>
                  <div style="font-weight:500;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ item.title }}</div>
                  @if (item.summary) {
                    <div style="font-size:11px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:300px">{{ item.summary }}</div>
                  }
                </td>
                <td><span class="badge badge-blue">{{ item.category }}</span></td>
                <td><span class="badge badge-gray" style="text-transform:uppercase;font-size:10px">{{ item.source }}</span></td>
                <td>
                  <span class="badge" [class]="item.isActive ? 'badge-green' : 'badge-gray'">
                    {{ item.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td style="text-align:right;white-space:nowrap">
                  <a [routerLink]="['/knowledge', item._id, 'edit']" class="btn btn-outline btn-sm">Edit</a>
                  <button class="btn btn-danger btn-sm" style="margin-left:6px" (click)="delete(item._id)">Delete</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
        @if (!items().length) {
          <div class="empty-state">
            <h3>No knowledge items yet</h3>
            <p>Import from CSV, SQL, JSON, or add items manually to train the bot.</p>
          </div>
        }
      </div>

      <div class="pagination">
        <span>{{ (page()-1)*pageSize + 1 }}–{{ min(page()*pageSize, total()) }} of {{ total() | number }}</span>
        <button class="btn btn-outline btn-sm" [disabled]="page()===1" (click)="goTo(page()-1)">←</button>
        <button class="btn btn-outline btn-sm" [disabled]="page()*pageSize>=total()" (click)="goTo(page()+1)">→</button>
      </div>
    }

    <!-- ── Maintenance zone ── -->
    <div style="margin-top:24px;display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <!-- Clean garbage -->
      <div style="border:1px solid #fbbf24;background:#fffbeb;border-radius:10px;padding:16px">
        <div style="font-weight:700;color:#92400e;margin-bottom:6px;font-size:14px">🧹 Clean Up Garbage Items</div>
        <p style="font-size:13px;color:#78350f;margin-bottom:12px">
          Removes items with numeric-only titles (e.g. "76", "89"), titles under 3 characters,
          or items where content equals the title — typically caused by importing SQL tables
          that have only ID and code columns.
        </p>
        <button class="btn btn-outline" style="border-color:#d97706;color:#92400e"
          (click)="cleanGarbage()" [disabled]="cleaning()">
          {{ cleaning() ? 'Cleaning…' : 'Find & Remove Garbage Items' }}
        </button>
      </div>

      <!-- Purge all -->
      <div class="danger-zone">
        <div style="font-weight:700;color:#dc2626;margin-bottom:6px;font-size:14px">⚠ Purge Everything</div>
        <p style="font-size:13px;color:#7f1d1d;margin-bottom:12px">
          Removes all {{ total() | number }} knowledge items permanently. Use before importing
          a completely new dataset. The bot will have no data until you re-import.
        </p>
        <button class="btn btn-danger" (click)="purgeAll()" [disabled]="purging() || !total()">
          {{ purging() ? 'Purging…' : 'Purge All ' + total() + ' Items' }}
        </button>
      </div>
    </div>
  `,
})
export class KnowledgeListComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  items = signal<KItem[]>([]);
  total = signal(0);
  categories = signal<string[]>([]);
  analytics = signal<KBAnalytics | null>(null);
  analyticsLoading = signal(false);
  loading = signal(true);
  purging = signal(false);
  page = signal(1);
  search = '';
  categoryFilter = '';
  readonly pageSize = 20;

  ngOnInit() { this.load(); this.loadAnalytics(); this.loadCategories(); }

  load() {
    this.loading.set(true);
    const params: Record<string, string | number> = { page: this.page(), limit: this.pageSize };
    if (this.search) params['search'] = this.search;
    if (this.categoryFilter) params['category'] = this.categoryFilter;
    this.api.get<{ items: KItem[]; total: number }>('knowledge', params).subscribe({
      next: r => { this.items.set(r.items ?? []); this.total.set(r.total ?? 0); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  loadCategories() {
    this.api.get<string[]>('knowledge/categories').subscribe({ next: c => this.categories.set(c), error: () => {} });
  }

  loadAnalytics() {
    this.analyticsLoading.set(true);
    this.api.get<KBAnalytics>('knowledge/analytics').subscribe({
      next: a => { this.analytics.set(a); this.analyticsLoading.set(false); },
      error: () => this.analyticsLoading.set(false),
    });
  }

  onSearch() { this.page.set(1); this.load(); }
  goTo(p: number) { this.page.set(p); this.load(); }
  min(a: number, b: number) { return Math.min(a, b); }

  catPct(count: number): number {
    const max = Math.max(...(this.analytics()?.byCategory.map(c => c.count) ?? [1]));
    return max ? Math.round((count / max) * 100) : 0;
  }

  srcColor(source: string): string {
    const colors: Record<string, string> = { sql: '#3b82f6', csv: '#22c55e', json: '#f59e0b', manual: '#8b5cf6', api: '#06b6d4' };
    return colors[source] ?? '#94a3b8';
  }

  async delete(id: string) {
    if (!confirm('Delete this item?')) return;
    this.api.delete(`knowledge/${id}`).subscribe({
      next: () => { this.toast.success('Item deleted'); this.load(); this.loadAnalytics(); },
      error: () => this.toast.error('Failed to delete'),
    });
  }

  cleaning = signal(false);

  async cleanGarbage() {
    this.cleaning.set(true);
    try {
      const res = await firstValueFrom(this.api.delete<{ deleted: number; examples: string[] }>('knowledge/invalid'));
      if (res?.deleted === 0) {
        this.toast.success('No garbage items found — knowledge base looks clean!');
      } else {
        this.toast.success(`Removed ${res.deleted} invalid item(s): "${res.examples?.join('", "') ?? ''}"`);
      }
      this.load();
      this.loadAnalytics();
    } catch (e: any) {
      this.toast.error(e?.error?.message ?? 'Cleanup failed');
    } finally {
      this.cleaning.set(false);
    }
  }

  async purgeAll() {
    const count = this.total();
    if (!confirm(`This will permanently delete ALL ${count} knowledge items. The bot will have no training data. Continue?`)) return;
    this.purging.set(true);
    try {
      const res = await firstValueFrom(this.api.delete<{ deleted: number }>('knowledge/all'));
      this.toast.success(`Purged ${res?.deleted ?? count} items — knowledge base is now empty`);
      this.load();
      this.loadAnalytics();
    } catch (e: any) {
      this.toast.error(e?.error?.message ?? 'Failed to purge');
    } finally {
      this.purging.set(false);
    }
  }
}
