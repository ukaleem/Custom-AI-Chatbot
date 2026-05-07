import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

interface KForm {
  title: string; content: string; summary: string;
  category: string; tags: string; isActive: boolean;
}

@Component({
  selector: 'app-knowledge-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <h1 class="page-title">{{ isEdit() ? 'Edit' : 'New' }} Knowledge Item</h1>
      <button class="btn btn-outline" type="button" (click)="router.navigate(['/knowledge'])">← Back</button>
    </div>

    @if (loadError()) {
      <div class="card" style="background:#fee2e2;border-color:#fca5a5;padding:20px;text-align:center">
        <div style="font-size:32px;margin-bottom:8px">⚠</div>
        <div style="font-weight:600;color:#dc2626;margin-bottom:4px">{{ loadError() }}</div>
        <button class="btn btn-outline" style="margin-top:12px" (click)="router.navigate(['/knowledge'])">
          Back to Knowledge Base
        </button>
      </div>
    } @else if (loadingItem()) {
      <div class="card" style="text-align:center;padding:40px">
        <div class="loading" style="margin:0 auto"><div class="spinner"></div></div>
        <div style="margin-top:12px;color:var(--text-muted);font-size:13px">Loading item…</div>
      </div>
    } @else {
      <form (ngSubmit)="onSubmit()" style="max-width:740px">

        <!-- Content card -->
        <div class="card" style="margin-bottom:16px">
          <div class="card-title">Content</div>

          <div class="form-group">
            <label class="form-label">
              Title *
              <small style="color:var(--text-muted);font-weight:400"> — shown as the item heading in bot responses</small>
            </label>
            <input class="form-control" [(ngModel)]="form.title" name="title"
              placeholder="e.g. Return Policy, Catania Cathedral, How to reset password"
              required [class.is-invalid]="submitted() && !form.title.trim()" />
            @if (submitted() && !form.title.trim()) {
              <div style="color:var(--danger);font-size:12px;margin-top:4px">Title is required</div>
            }
          </div>

          <div class="form-group">
            <label class="form-label">
              Full Content *
              <small style="color:var(--text-muted);font-weight:400"> — the bot reads this to answer questions</small>
            </label>
            <textarea class="form-control" [(ngModel)]="form.content" name="content" rows="7"
              placeholder="Full description, policy text, product details, FAQ answer, attraction description…"
              required [class.is-invalid]="submitted() && !form.content.trim()"></textarea>
            @if (submitted() && !form.content.trim()) {
              <div style="color:var(--danger);font-size:12px;margin-top:4px">Content is required</div>
            }
            <div style="font-size:11px;color:var(--text-muted);margin-top:4px">
              {{ form.content.length }} characters — richer content = better bot answers
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">
              Summary
              <small style="color:var(--text-muted);font-weight:400"> — optional one-liner for quick overviews</small>
            </label>
            <input class="form-control" [(ngModel)]="form.summary" name="summary"
              placeholder="One sentence describing this item" />
          </div>
        </div>

        <!-- Classification card -->
        <div class="card" style="margin-bottom:16px">
          <div class="card-title">Classification</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
            <div class="form-group">
              <label class="form-label">Category</label>
              <input class="form-control" [(ngModel)]="form.category" name="category"
                placeholder="culture, food, support, product…"
                list="cat-list" />
              <datalist id="cat-list">
                @for (c of CATEGORIES; track c) { <option [value]="c">{{ c }}</option> }
              </datalist>
            </div>
            <div class="form-group">
              <label class="form-label">Tags <small style="font-weight:400;color:var(--text-muted)">(comma-separated)</small></label>
              <input class="form-control" [(ngModel)]="form.tags" name="tags"
                placeholder="catania, baroque, free-entry" />
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:8px">
            <input type="checkbox" [(ngModel)]="form.isActive" name="isActive" id="isActive"
              style="width:16px;height:16px;cursor:pointer" />
            <label for="isActive" style="font-size:14px;cursor:pointer;margin:0">
              Active — bot can use this item to answer questions
            </label>
          </div>
        </div>

        <!-- Server error -->
        @if (error()) {
          <div style="background:#fee2e2;color:#dc2626;padding:12px 16px;border-radius:8px;margin-bottom:16px;font-size:13px">
            <strong>Save failed:</strong> {{ error() }}
          </div>
        }

        <!-- Actions -->
        <div style="display:flex;gap:12px;align-items:center">
          <button type="submit" class="btn btn-primary" [disabled]="saving()">
            @if (saving()) { {{ isEdit() ? 'Saving…' : 'Creating…' }} }
            @else { {{ isEdit() ? 'Save Changes' : 'Create Item' }} }
          </button>
          <button type="button" class="btn btn-outline" (click)="router.navigate(['/knowledge'])" [disabled]="saving()">
            Cancel
          </button>
          @if (isEdit()) {
            <span style="font-size:12px;color:var(--text-muted);margin-left:auto">
              Item ID: <code style="font-size:11px">{{ editId }}</code>
            </span>
          }
        </div>
      </form>
    }
  `,
})
export class KnowledgeFormComponent implements OnInit {
  readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  isEdit = signal(false);
  loadingItem = signal(false);
  loadError = signal('');
  saving = signal(false);
  submitted = signal(false);
  error = signal('');
  editId = '';

  form: KForm = {
    title: '', content: '', summary: '',
    category: 'general', tags: '', isActive: true,
  };

  readonly CATEGORIES = [
    'culture', 'food', 'nature', 'entertainment', 'city-tour', 'shopping',
    'transport', 'healthcare', 'safety', 'children', 'support', 'faq',
    'product', 'policy', 'pricing', 'technical', 'legal', 'general',
  ];

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.isEdit.set(true);
    this.editId = id;
    this.loadingItem.set(true);

    this.api.get<Record<string, unknown>>(`knowledge/${id}`).subscribe({
      next: (item) => {
        if (!item) { this.loadError.set('Item not found.'); this.loadingItem.set(false); return; }
        this.form = {
          title:    String(item['title']   ?? ''),
          content:  String(item['content'] ?? ''),
          summary:  String(item['summary'] ?? ''),
          category: String(item['category'] ?? 'general'),
          tags:     ((item['tags'] as string[]) ?? []).join(', '),
          isActive: Boolean(item['isActive'] ?? true),
        };
        this.loadingItem.set(false);
      },
      error: (e: any) => {
        const msg = e?.status === 404 ? 'Item not found.' :
                    e?.status === 401 ? 'Session expired — please log out and back in.' :
                    `Could not load item (${e?.status ?? 'network error'}).`;
        this.loadError.set(msg);
        this.loadingItem.set(false);
      },
    });
  }

  onSubmit() {
    this.submitted.set(true);
    if (!this.form.title.trim() || !this.form.content.trim()) return;

    this.saving.set(true);
    this.error.set('');

    const payload = {
      title:    this.form.title.trim(),
      content:  this.form.content.trim(),
      summary:  this.form.summary.trim(),
      category: this.form.category.trim() || 'general',
      tags:     this.form.tags.split(',').map(t => t.trim()).filter(Boolean),
      isActive: this.form.isActive,
    };

    const req = this.isEdit()
      ? this.api.put(`knowledge/${this.editId}`, payload)
      : this.api.post('knowledge', payload);

    req.subscribe({
      next: () => {
        this.toast.success(this.isEdit() ? '✓ Item updated successfully' : '✓ Item created successfully');
        this.router.navigate(['/knowledge']);
      },
      error: (e: any) => {
        const msg = e?.error?.message;
        this.error.set(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to save. Check your inputs and try again.'));
        this.saving.set(false);
      },
    });
  }
}
