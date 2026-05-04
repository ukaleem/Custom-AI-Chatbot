import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

interface AttractionForm {
  name: { en: string; it: string; de: string };
  description: { en: string; it: string };
  shortDescription: { en: string };
  category: string;
  tags: string;
  address: string;
  lat: number | null;
  lng: number | null;
  priceRange: string;
  durationMinutes: number | null;
  foodStyle: string;
  isActive: boolean;
}

@Component({
  selector: 'app-attraction-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <h1 class="page-title">{{ isEdit() ? 'Edit' : 'New' }} Attraction</h1>
    </div>

    <form (ngSubmit)="onSubmit()" style="max-width:720px">
      <div class="card" style="margin-bottom:16px">
        <div class="card-title">Basic Info</div>
        <div class="form-group">
          <label class="form-label">Name (English) *</label>
          <input class="form-control" [(ngModel)]="form.name.en" name="nameEn" required />
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-group">
            <label class="form-label">Name (Italian)</label>
            <input class="form-control" [(ngModel)]="form.name.it" name="nameIt" />
          </div>
          <div class="form-group">
            <label class="form-label">Name (German)</label>
            <input class="form-control" [(ngModel)]="form.name.de" name="nameDe" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Short Description (English) *</label>
          <input class="form-control" [(ngModel)]="form.shortDescription.en" name="shortDesc" required />
        </div>
        <div class="form-group">
          <label class="form-label">Full Description (English) *</label>
          <textarea class="form-control" [(ngModel)]="form.description.en" name="descEn" rows="4" required></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Address</label>
          <input class="form-control" [(ngModel)]="form.address" name="address" placeholder="Via Roma 1, Catania" />
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-group">
            <label class="form-label">Latitude *</label>
            <input class="form-control" type="number" step="any" [(ngModel)]="form.lat" name="lat" placeholder="37.5026" required />
          </div>
          <div class="form-group">
            <label class="form-label">Longitude *</label>
            <input class="form-control" type="number" step="any" [(ngModel)]="form.lng" name="lng" placeholder="15.0878" required />
          </div>
        </div>
        <small style="color:var(--text-muted);font-size:12px;display:block;margin-top:-8px;margin-bottom:8px">Find coordinates on <a href="https://www.google.com/maps" target="_blank">Google Maps</a> → right-click the location → copy coordinates.</small>
      </div>

      <div class="card" style="margin-bottom:16px">
        <div class="card-title">Classification</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
          <div class="form-group">
            <label class="form-label">Category *</label>
            <select class="form-control" [(ngModel)]="form.category" name="category" required>
              <option value="">Select…</option>
              <option value="culture">Culture</option>
              <option value="entertainment">Entertainment</option>
              <option value="city-tour">City Tour</option>
              <option value="food">Food</option>
              <option value="nature">Nature</option>
              <option value="shopping">Shopping</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Price Range</label>
            <select class="form-control" [(ngModel)]="form.priceRange" name="priceRange">
              <option value="">—</option>
              <option value="free">Free</option>
              <option value="budget">Budget</option>
              <option value="mid-range">Mid-range</option>
              <option value="expensive">Expensive</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Duration (min)</label>
            <input class="form-control" type="number" [(ngModel)]="form.durationMinutes" name="duration" min="1" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Food Style (only for food category)</label>
          <select class="form-control" [(ngModel)]="form.foodStyle" name="foodStyle">
            <option value="">—</option>
            <option value="sitting">Sit-down restaurant</option>
            <option value="walking">Street food / walking</option>
            <option value="both">Both</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Tags (comma-separated)</label>
          <input class="form-control" [(ngModel)]="form.tags" name="tags" placeholder="baroque, historic, free-entry" />
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <input type="checkbox" [(ngModel)]="form.isActive" name="isActive" id="isActive" />
          <label for="isActive" style="font-size:14px;cursor:pointer">Active (visible to the bot)</label>
        </div>
      </div>

      @if (error()) {
        <div style="background:#fee2e2;color:#dc2626;padding:10px 14px;border-radius:6px;margin-bottom:16px;font-size:13px">{{ error() }}</div>
      }

      <div style="display:flex;gap:12px">
        <button type="submit" class="btn btn-primary" [disabled]="saving()">
          {{ saving() ? 'Saving…' : (isEdit() ? 'Save Changes' : 'Create Attraction') }}
        </button>
        <button type="button" class="btn btn-outline" (click)="router.navigate(['/attractions'])">Cancel</button>
      </div>
    </form>
  `,
})
export class AttractionFormComponent implements OnInit {
  readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  isEdit = signal(false);
  saving = signal(false);
  error = signal('');
  private editId = '';

  form: AttractionForm = { name: { en: '', it: '', de: '' }, description: { en: '', it: '' }, shortDescription: { en: '' }, category: '', tags: '', address: '', lat: null, lng: null, priceRange: '', durationMinutes: null, foodStyle: '', isActive: true };

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.editId = id;
      this.api.get<Record<string, unknown>>(`attractions/${id}`).subscribe((a) => {
        const n = a['name'] as Record<string, string> ?? {};
        const d = a['description'] as Record<string, string> ?? {};
        const s = a['shortDescription'] as Record<string, string> ?? {};
        const loc = a['location'] as Record<string, number> ?? {};
        this.form = { name: { en: n['en']??'', it: n['it']??'', de: n['de']??'' }, description: { en: d['en']??'', it: d['it']??'' }, shortDescription: { en: s['en']??'' }, category: String(a['category']??''), tags: (a['tags'] as string[])?.join(', ')??'', address: String(a['address']??''), lat: loc['lat']??null, lng: loc['lng']??null, priceRange: String(a['priceRange']??''), durationMinutes: a['durationMinutes'] as number ?? null, foodStyle: String(a['foodStyle']??''), isActive: Boolean(a['isActive']??true) };
      });
    }
  }

  onSubmit() {
    this.saving.set(true);
    this.error.set('');
    const { lat, lng, tags, ...rest } = this.form;
    const payload = {
      ...rest,
      location: { lat: lat ?? 0, lng: lng ?? 0 },
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    };
    const req = this.isEdit()
      ? this.api.put(`attractions/${this.editId}`, payload)
      : this.api.post('attractions', payload);
    req.subscribe({
      next: () => { this.toast.success(this.isEdit() ? 'Attraction updated' : 'Attraction created'); this.router.navigate(['/attractions']); },
      error: (e) => { this.error.set(e?.error?.message ?? 'Failed to save'); this.saving.set(false); },
    });
  }
}
