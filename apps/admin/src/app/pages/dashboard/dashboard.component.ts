import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

interface Overview {
  sessions: { total: number; today: number; thisMonth: number; active: number };
  languages: { language: string; count: number }[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-header">
      <h1 class="page-title">Dashboard</h1>
    </div>

    @if (loading()) {
      <div class="loading"><div class="spinner"></div></div>
    } @else if (data()) {
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">Total Sessions</div>
          <div class="stat-value">{{ data()!.sessions.total }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Today</div>
          <div class="stat-value">{{ data()!.sessions.today }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">This Month</div>
          <div class="stat-value">{{ data()!.sessions.thisMonth }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Active Now</div>
          <div class="stat-value">{{ data()!.sessions.active }}</div>
        </div>
      </div>

      <div class="card" style="max-width:500px">
        <div class="card-title">Languages</div>
        @for (lang of data()!.languages; track lang.language) {
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
            <span style="font-weight:500">{{ lang.language | uppercase }}</span>
            <span class="badge badge-blue">{{ lang.count }}</span>
          </div>
        }
        @if (!data()!.languages.length) {
          <div class="empty-state" style="padding:24px"><h3>No data yet</h3></div>
        }
      </div>

      <div style="margin-top:24px;display:flex;gap:12px">
        <a routerLink="/attractions" class="btn btn-outline">Manage Attractions</a>
        <a routerLink="/conversations" class="btn btn-outline">View Conversations</a>
      </div>
    }
  `,
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  data = signal<Overview | null>(null);
  loading = signal(true);

  ngOnInit() {
    this.api.get<Overview>('analytics/overview').subscribe({
      next: (d) => { this.data.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
