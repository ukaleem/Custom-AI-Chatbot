import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { firstValueFrom } from 'rxjs';

interface UsageData {
  plan: string;
  planName: string;
  priceMonthly: number;
  sessions: { used: number; limit: number; remaining: number; percentUsed: number; unlimited: boolean };
  messages: { thisMonth: number };
  allTime: { totalSessions: number };
  resetDate: string;
  features: { supportedLanguages: string[]; analyticsAccess: string; customBranding: boolean };
}

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    .plan-card { border: 2px solid var(--border); border-radius: 12px; padding: 20px; margin-bottom: 12px; cursor: pointer; transition: border-color .15s, background .15s; }
    .plan-card.current { border-color: var(--primary); background: #eff6ff; }
    .plan-card:hover:not(.current) { border-color: #94a3b8; }
    .plan-name { font-weight: 700; font-size: 16px; margin-bottom: 2px; }
    .plan-price { font-size: 22px; font-weight: 700; color: var(--primary); }
    .plan-price span { font-size: 13px; font-weight: 400; color: var(--text-muted); }
    .progress-bar { height: 8px; background: var(--border); border-radius: 4px; overflow: hidden; margin: 8px 0; }
    .progress-fill { height: 100%; border-radius: 4px; transition: width .4s; }
    .progress-fill.ok { background: var(--primary); }
    .progress-fill.warn { background: #f59e0b; }
    .progress-fill.danger { background: var(--danger); }
    .feature-list { list-style: none; padding: 0; margin: 8px 0 0; }
    .feature-list li { font-size: 13px; color: var(--text-muted); margin-bottom: 4px; }
    .feature-list li::before { content: '✓ '; color: #16a34a; font-weight: 700; }
  `],
  template: `
    <div class="page-header">
      <h1 class="page-title">Billing & Plan</h1>
    </div>

    @if (loading()) {
      <div class="loading"><div class="spinner"></div></div>
    } @else if (usage()) {
      <!-- Current usage card -->
      <div class="card" style="margin-bottom:20px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
          <div>
            <div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Current Plan</div>
            <div style="font-size:24px;font-weight:700">{{ usage()!.planName }}</div>
            <div style="color:var(--text-muted);font-size:13px;margin-top:2px">
              @if (usage()!.priceMonthly > 0) { \${{ usage()!.priceMonthly }}/month }
              @else { Custom pricing }
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-size:12px;color:var(--text-muted)">Resets</div>
            <div style="font-weight:600;font-size:14px">{{ usage()!.resetDate | date:'MMM d, y' }}</div>
          </div>
        </div>

        <!-- Usage bar -->
        <div style="margin-top:20px">
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
            <span style="font-weight:500">Chat Sessions This Month</span>
            @if (usage()!.sessions.unlimited) {
              <span style="color:#16a34a;font-weight:600">Unlimited</span>
            } @else {
              <span>
                <strong>{{ usage()!.sessions.used | number }}</strong>
                / {{ usage()!.sessions.limit | number }}
              </span>
            }
          </div>
          @if (!usage()!.sessions.unlimited) {
            <div class="progress-bar">
              <div class="progress-fill"
                [class.ok]="usage()!.sessions.percentUsed < 80"
                [class.warn]="usage()!.sessions.percentUsed >= 80 && usage()!.sessions.percentUsed < 100"
                [class.danger]="usage()!.sessions.percentUsed >= 100"
                [style.width]="(usage()!.sessions.percentUsed | number:'1.0-0') + '%'">
              </div>
            </div>
            @if (usage()!.sessions.percentUsed >= 80) {
              <div style="font-size:12px;color:{{ usage()!.sessions.percentUsed >= 100 ? '#dc2626' : '#d97706' }};margin-top:4px">
                @if (usage()!.sessions.percentUsed >= 100) {
                  ⛔ Limit reached — new chat sessions are blocked. Upgrade to continue.
                } @else {
                  ⚠️ {{ usage()!.sessions.remaining | number }} sessions remaining this month.
                }
              </div>
            }
          }
        </div>

        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:20px">
          <div style="background:var(--bg);padding:12px;border-radius:8px;text-align:center">
            <div style="font-size:22px;font-weight:700">{{ usage()!.sessions.used | number }}</div>
            <div style="font-size:11px;color:var(--text-muted)">Sessions (month)</div>
          </div>
          <div style="background:var(--bg);padding:12px;border-radius:8px;text-align:center">
            <div style="font-size:22px;font-weight:700">{{ usage()!.messages.thisMonth | number }}</div>
            <div style="font-size:11px;color:var(--text-muted)">Messages (month)</div>
          </div>
          <div style="background:var(--bg);padding:12px;border-radius:8px;text-align:center">
            <div style="font-size:22px;font-weight:700">{{ usage()!.allTime.totalSessions | number }}</div>
            <div style="font-size:11px;color:var(--text-muted)">Total sessions</div>
          </div>
        </div>
      </div>

      <!-- Plan selection -->
      <div class="card-title" style="margin-bottom:12px;font-weight:700;font-size:15px">Change Plan</div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:24px">
        @for (plan of plans; track plan.key) {
          <div class="plan-card" [class.current]="usage()!.plan === plan.key" (click)="selectPlan(plan.key)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <div class="plan-name">{{ plan.name }}</div>
              @if (usage()!.plan === plan.key) {
                <span class="badge badge-blue">Current</span>
              }
            </div>
            <div class="plan-price">
              @if (plan.price > 0) { \${{ plan.price }}<span>/mo</span> }
              @else { Custom }
            </div>
            <ul class="feature-list">
              <li>{{ plan.sessions }} sessions/mo</li>
              <li>{{ plan.languages }} languages</li>
              <li>{{ plan.analytics }} analytics</li>
              @if (plan.branding) { <li>Custom branding</li> }
            </ul>
          </div>
        }
      </div>

      @if (selectedPlan() && selectedPlan() !== usage()!.plan) {
        <div style="display:flex;align-items:center;gap:12px">
          <button class="btn btn-primary" [disabled]="saving()" (click)="changePlan()">
            {{ saving() ? 'Updating…' : 'Switch to ' + planName(selectedPlan()!) }}
          </button>
          <button class="btn btn-outline" (click)="selectedPlan.set(null)">Cancel</button>
        </div>
      }
    }
  `,
})
export class BillingComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  loading = signal(true);
  saving = signal(false);
  usage = signal<UsageData | null>(null);
  selectedPlan = signal<string | null>(null);

  readonly plans = [
    { key: 'starter', name: 'Starter', price: 49, sessions: '500', languages: '2', analytics: 'Basic', branding: false },
    { key: 'pro', name: 'Pro', price: 149, sessions: '5,000', languages: '5', analytics: 'Full', branding: true },
    { key: 'enterprise', name: 'Enterprise', price: 0, sessions: 'Unlimited', languages: '5', analytics: 'Full + export', branding: true },
  ];

  ngOnInit() {
    this.api.get<UsageData>('billing/usage').subscribe({
      next: (d) => { this.usage.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  selectPlan(key: string) {
    this.selectedPlan.set(this.selectedPlan() === key ? null : key);
  }

  planName(key: string) {
    return this.plans.find(p => p.key === key)?.name ?? key;
  }

  async changePlan() {
    const plan = this.selectedPlan();
    if (!plan) return;
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.put('billing/plan', { plan }));
      this.toast.success(`Switched to ${this.planName(plan)} plan`);
      this.selectedPlan.set(null);
      // Reload usage
      const updated = await firstValueFrom(this.api.get<UsageData>('billing/usage'));
      this.usage.set(updated);
    } catch (e: any) {
      this.toast.error(e?.error?.message ?? 'Failed to change plan');
    } finally {
      this.saving.set(false);
    }
  }
}
