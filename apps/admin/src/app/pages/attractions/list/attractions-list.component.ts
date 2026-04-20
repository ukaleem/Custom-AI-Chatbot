import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

interface Attraction { _id: string; name: { en: string }; category: string; priceRange?: string; isActive: boolean; }

@Component({
  selector: 'app-attractions-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page-header">
      <h1 class="page-title">Attractions ({{ total() }})</h1>
      <a routerLink="/attractions/new" class="btn btn-primary">+ Add Attraction</a>
    </div>

    <div class="card" style="margin-bottom:16px;padding:16px">
      <input class="form-control" placeholder="Search by name..." [(ngModel)]="search" (input)="onSearch()" style="max-width:300px" />
    </div>

    @if (loading()) {
      <div class="loading"><div class="spinner"></div></div>
    } @else {
      <div class="card" style="padding:0;overflow:hidden">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (a of attractions(); track a._id) {
              <tr>
                <td style="font-weight:500">{{ a.name?.en }}</td>
                <td><span class="badge badge-blue">{{ a.category }}</span></td>
                <td>{{ a.priceRange ?? '—' }}</td>
                <td>
                  <span class="badge" [class]="a.isActive ? 'badge-green' : 'badge-gray'">
                    {{ a.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td style="text-align:right">
                  <a [routerLink]="['/attractions', a._id, 'edit']" class="btn btn-outline btn-sm">Edit</a>
                  <button class="btn btn-danger btn-sm" style="margin-left:6px" (click)="delete(a._id)">Delete</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
        @if (!attractions().length) {
          <div class="empty-state">
            <h3>No attractions yet</h3>
            <p>Add your first attraction to power the bot's recommendations.</p>
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
export class AttractionsListComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  attractions = signal<Attraction[]>([]);
  total = signal(0);
  loading = signal(true);
  page = signal(1);
  search = '';
  readonly pageSize = 20;

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const params: Record<string, string | number> = { page: this.page(), limit: this.pageSize };
    if (this.search) params['search'] = this.search;
    this.api.get<{ items: Attraction[]; total: number }>('attractions', params).subscribe({
      next: (r) => { this.attractions.set(r.items ?? r as unknown as Attraction[]); this.total.set(r.total ?? 0); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  onSearch() { this.page.set(1); this.load(); }
  goTo(p: number) { this.page.set(p); this.load(); }
  min(a: number, b: number) { return Math.min(a, b); }

  delete(id: string) {
    if (!confirm('Delete this attraction?')) return;
    this.api.delete(`attractions/${id}`).subscribe({
      next: () => { this.toast.success('Attraction deleted'); this.load(); },
      error: () => this.toast.error('Failed to delete'),
    });
  }
}
