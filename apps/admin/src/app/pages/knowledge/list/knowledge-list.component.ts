import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

interface KItem { _id: string; title: string; category: string; source: string; isActive: boolean; createdAt: string; }

@Component({
  selector: 'app-knowledge-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page-header">
      <h1 class="page-title">Knowledge Base ({{ total() }})</h1>
      <div style="display:flex;gap:8px">
        <a routerLink="/knowledge/import" class="btn btn-outline">Import Data</a>
        <a routerLink="/knowledge/new" class="btn btn-primary">+ Add Item</a>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px;padding:14px 16px;display:flex;gap:10px;flex-wrap:wrap">
      <input class="form-control" placeholder="Search title, content, tags…" [(ngModel)]="search"
        (input)="onSearch()" style="max-width:260px" />
      <select class="form-control" style="max-width:160px" [(ngModel)]="categoryFilter" (change)="onSearch()">
        <option value="">All Categories</option>
        @for (c of categories(); track c) { <option [value]="c">{{ c }}</option> }
      </select>
    </div>

    @if (loading()) {
      <div class="loading"><div class="spinner"></div></div>
    } @else {
      <div class="card" style="padding:0;overflow:hidden">
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
                <td style="font-weight:500;max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ item.title }}</td>
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
            <p>Add items manually or import from CSV, SQL, or JSON to power the bot.</p>
          </div>
        }
      </div>

      <div class="pagination">
        <span>{{ (page()-1)*pageSize + 1 }}–{{ min(page()*pageSize, total()) }} of {{ total() }}</span>
        <button class="btn btn-outline btn-sm" [disabled]="page()===1" (click)="goTo(page()-1)">←</button>
        <button class="btn btn-outline btn-sm" [disabled]="page()*pageSize>=total()" (click)="goTo(page()+1)">→</button>
      </div>
    }
  `,
})
export class KnowledgeListComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  items = signal<KItem[]>([]);
  total = signal(0);
  categories = signal<string[]>([]);
  loading = signal(true);
  page = signal(1);
  search = '';
  categoryFilter = '';
  readonly pageSize = 20;

  ngOnInit() {
    this.load();
    this.api.get<string[]>('knowledge/categories').subscribe({ next: c => this.categories.set(c), error: () => {} });
  }

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

  onSearch() { this.page.set(1); this.load(); }
  goTo(p: number) { this.page.set(p); this.load(); }
  min(a: number, b: number) { return Math.min(a, b); }

  delete(id: string) {
    if (!confirm('Delete this knowledge item?')) return;
    this.api.delete(`knowledge/${id}`).subscribe({
      next: () => { this.toast.success('Item deleted'); this.load(); },
      error: () => this.toast.error('Failed to delete'),
    });
  }
}
