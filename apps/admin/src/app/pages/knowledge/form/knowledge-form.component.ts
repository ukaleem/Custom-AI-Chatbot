import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

interface KForm { title: string; content: string; summary: string; category: string; tags: string; isActive: boolean; }

@Component({
  selector: 'app-knowledge-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <h1 class="page-title">{{ isEdit() ? 'Edit' : 'New' }} Knowledge Item</h1>
    </div>

    <form (ngSubmit)="onSubmit()" style="max-width:720px">
      <div class="card" style="margin-bottom:16px">
        <div class="card-title">Content</div>

        <div class="form-group">
          <label class="form-label">Title * <small style="color:var(--text-muted)">(shown as the item heading in bot responses)</small></label>
          <input class="form-control" [(ngModel)]="form.title" name="title" placeholder="e.g. Return Policy, Product X, How to reset password" required />
        </div>

        <div class="form-group">
          <label class="form-label">Full Content * <small style="color:var(--text-muted)">(the bot reads this to answer questions)</small></label>
          <textarea class="form-control" [(ngModel)]="form.content" name="content" rows="6"
            placeholder="Full description, policy text, product details, FAQ answer…" required></textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Summary <small style="color:var(--text-muted)">(optional one-liner the bot uses for quick overviews)</small></label>
          <input class="form-control" [(ngModel)]="form.summary" name="summary"
            placeholder="Brief one-sentence summary" />
        </div>
      </div>

      <div class="card" style="margin-bottom:16px">
        <div class="card-title">Classification</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-group">
            <label class="form-label">Category</label>
            <input class="form-control" [(ngModel)]="form.category" name="category"
              placeholder="e.g. support, products, faq, policy" list="cat-suggestions" />
            <datalist id="cat-suggestions">
              @for (c of categorySuggestions; track c) { <option [value]="c">{{ c }}</option> }
            </datalist>
          </div>
          <div class="form-group">
            <label class="form-label">Tags <small style="color:var(--text-muted)">(comma-separated)</small></label>
            <input class="form-control" [(ngModel)]="form.tags" name="tags"
              placeholder="refund, account, billing" />
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
          <input type="checkbox" [(ngModel)]="form.isActive" name="isActive" id="isActive" />
          <label for="isActive" style="font-size:14px;cursor:pointer">Active — bot can use this item to answer questions</label>
        </div>
      </div>

      @if (error()) {
        <div style="background:#fee2e2;color:#dc2626;padding:10px 14px;border-radius:6px;margin-bottom:16px;font-size:13px">{{ error() }}</div>
      }

      <div style="display:flex;gap:12px">
        <button type="submit" class="btn btn-primary" [disabled]="saving()">
          {{ saving() ? 'Saving…' : (isEdit() ? 'Save Changes' : 'Create Item') }}
        </button>
        <button type="button" class="btn btn-outline" (click)="router.navigate(['/knowledge'])">Cancel</button>
      </div>
    </form>
  `,
})
export class KnowledgeFormComponent implements OnInit {
  readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  isEdit = signal(false);
  saving = signal(false);
  error = signal('');
  private editId = '';

  form: KForm = { title: '', content: '', summary: '', category: 'general', tags: '', isActive: true };

  readonly categorySuggestions = ['general', 'support', 'faq', 'product', 'policy', 'pricing', 'technical', 'legal'];

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.editId = id;
      this.api.get<any>(`knowledge/${id}`).subscribe(item => {
        this.form = {
          title: item.title ?? '',
          content: item.content ?? '',
          summary: item.summary ?? '',
          category: item.category ?? 'general',
          tags: (item.tags ?? []).join(', '),
          isActive: item.isActive ?? true,
        };
      });
    }
  }

  onSubmit() {
    this.saving.set(true);
    this.error.set('');
    const payload = {
      ...this.form,
      tags: this.form.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
    };
    const req = this.isEdit()
      ? this.api.put(`knowledge/${this.editId}`, payload)
      : this.api.post('knowledge', payload);
    req.subscribe({
      next: () => {
        this.toast.success(this.isEdit() ? 'Item updated' : 'Item created');
        this.router.navigate(['/knowledge']);
      },
      error: (e: any) => { this.error.set(e?.error?.message ?? 'Failed to save'); this.saving.set(false); },
    });
  }
}
