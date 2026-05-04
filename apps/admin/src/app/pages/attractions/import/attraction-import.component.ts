import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { firstValueFrom } from 'rxjs';

interface ParsedRow {
  nameEn: string;
  category: string;
  address: string;
  lat: string;
  lng: string;
  descriptionEn: string;
  shortDescriptionEn: string;
  tags: string;
  priceRange: string;
  durationMinutes: string;
  imageUrl: string;
  valid: boolean;
  error: string;
}

const CSV_TEMPLATE = [
  'name_en,category,address,lat,lng,description_en,short_description_en,tags,price_range,duration_minutes,image_url',
  '"Catania Cathedral","culture","Piazza del Duomo, Catania",37.5026,15.0878,"Baroque cathedral with stunning architecture","Historic cathedral in Piazza del Duomo","history,baroque,architecture","free",60,""',
].join('\n');

@Component({
  selector: 'app-attraction-import',
  standalone: true,
  imports: [CommonModule, RouterLink],
  styles: [`
    .drop-zone {
      border: 2px dashed var(--border);
      border-radius: 10px;
      padding: 40px 20px;
      text-align: center;
      cursor: pointer;
      transition: border-color .2s, background .2s;
    }
    .drop-zone:hover, .drop-zone.drag-over { border-color: var(--primary); background: #eff6ff; }
    .drop-zone svg { color: var(--text-muted); margin-bottom: 12px; }
    .preview-table { font-size: 12px; }
    .preview-table td, .preview-table th { max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .row-error { background: #fef2f2 !important; }
    .progress-bar { height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
    .progress-fill { height: 100%; background: var(--primary); transition: width .3s; }
  `],
  template: `
    <div class="page-header">
      <h1 class="page-title">Bulk CSV Import</h1>
      <a routerLink="/attractions" class="btn btn-outline">← Back to Attractions</a>
    </div>

    <!-- Instructions -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-title">Instructions</div>
      <p style="margin-bottom:12px;color:var(--text-muted);font-size:13px">
        Upload a CSV file with up to 100 attractions. Required columns:
        <code>name_en</code>, <code>category</code>, <code>address</code>, <code>lat</code>, <code>lng</code>,
        <code>description_en</code>, <code>short_description_en</code>.
        Valid categories: <code>culture</code>, <code>entertainment</code>, <code>city-tour</code>, <code>food</code>,
        <code>transport</code>, <code>children</code>, <code>healthcare</code>, <code>safety</code>,
        <code>shopping</code>, <code>nature</code>.
      </p>
      <button class="btn btn-outline btn-sm" (click)="downloadTemplate()">Download Template CSV</button>
    </div>

    <!-- Drop zone -->
    @if (!rows().length) {
      <div class="card">
        <div
          class="drop-zone"
          [class.drag-over]="dragging()"
          (click)="fileInput.click()"
          (dragover)="$event.preventDefault(); dragging.set(true)"
          (dragleave)="dragging.set(false)"
          (drop)="onDrop($event)">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <p style="font-size:14px;font-weight:500;margin-bottom:4px">Drop CSV file here or click to browse</p>
          <p style="font-size:12px;color:var(--text-muted)">Max 100 rows · UTF-8 encoding</p>
        </div>
        <input #fileInput type="file" accept=".csv,text/csv" style="display:none" (change)="onFileChange($event)" />
      </div>
    }

    <!-- Preview table -->
    @if (rows().length) {
      <div class="card" style="padding:0;overflow:hidden;margin-bottom:16px">
        <div style="padding:16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
          <span style="font-weight:600">
            Preview — {{ validCount() }} valid / {{ rows().length }} rows
            @if (invalidCount()) { <span class="badge badge-red" style="margin-left:8px">{{ invalidCount() }} errors</span> }
          </span>
          <button class="btn btn-outline btn-sm" (click)="reset()">Change File</button>
        </div>
        <div style="overflow-x:auto">
          <table class="preview-table">
            <thead>
              <tr>
                <th>#</th><th>Name (EN)</th><th>Category</th><th>Address</th>
                <th>Lat</th><th>Lng</th><th>Price</th><th>Duration</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              @for (r of rows(); track $index) {
                <tr [class.row-error]="!r.valid">
                  <td>{{ $index + 1 }}</td>
                  <td>{{ r.nameEn }}</td>
                  <td>{{ r.category }}</td>
                  <td>{{ r.address }}</td>
                  <td>{{ r.lat }}</td>
                  <td>{{ r.lng }}</td>
                  <td>{{ r.priceRange || '—' }}</td>
                  <td>{{ r.durationMinutes || '—' }}</td>
                  <td>
                    @if (r.valid) {
                      <span class="badge badge-green">OK</span>
                    } @else {
                      <span class="badge badge-red" [title]="r.error">Error</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      @if (importing()) {
        <div class="card" style="margin-bottom:16px">
          <p style="font-size:13px;margin-bottom:8px">Importing {{ validCount() }} attractions…</p>
          <div class="progress-bar"><div class="progress-fill" [style.width]="progress() + '%'"></div></div>
        </div>
      }

      <div style="display:flex;gap:10px">
        <button
          class="btn btn-primary"
          [disabled]="!validCount() || importing()"
          (click)="importAttractions()">
          {{ importing() ? 'Importing…' : 'Import ' + validCount() + ' Attractions' }}
        </button>
        <button class="btn btn-outline" (click)="reset()" [disabled]="importing()">Cancel</button>
      </div>
    }
  `,
})
export class AttractionImportComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  rows = signal<ParsedRow[]>([]);
  dragging = signal(false);
  importing = signal(false);
  progress = signal(0);

  validCount() { return this.rows().filter(r => r.valid).length; }
  invalidCount() { return this.rows().filter(r => !r.valid).length; }

  downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'attractions-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) this.processFile(file);
  }

  onFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.processFile(file);
  }

  reset() {
    this.rows.set([]);
    this.progress.set(0);
  }

  private processFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = this.parseCsv(text);
      this.rows.set(parsed);
    };
    reader.readAsText(file);
  }

  private parseCsv(text: string): ParsedRow[] {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = this.splitCsvLine(lines[0]).map(h => h.trim().toLowerCase());
    const col = (name: string) => headers.indexOf(name);

    const VALID_CATEGORIES = new Set([
      'culture', 'entertainment', 'city-tour', 'food', 'transport',
      'children', 'healthcare', 'safety', 'shopping', 'nature',
    ]);
    const VALID_PRICES = new Set(['', 'free', 'budget', 'mid-range', 'expensive']);

    return lines.slice(1).map(line => {
      const cells = this.splitCsvLine(line);
      const get = (name: string) => (cells[col(name)] ?? '').trim();

      const nameEn = get('name_en');
      const category = get('category');
      const address = get('address');
      const lat = get('lat');
      const lng = get('lng');
      const descriptionEn = get('description_en');
      const shortDescriptionEn = get('short_description_en');
      const tags = get('tags');
      const priceRange = get('price_range');
      const durationMinutes = get('duration_minutes');
      const imageUrl = get('image_url');

      let error = '';
      if (!nameEn) error = 'name_en required';
      else if (!category || !VALID_CATEGORIES.has(category)) error = `invalid category: ${category}`;
      else if (!address) error = 'address required';
      else if (!lat || isNaN(parseFloat(lat))) error = 'invalid lat';
      else if (!lng || isNaN(parseFloat(lng))) error = 'invalid lng';
      else if (!descriptionEn) error = 'description_en required';
      else if (!shortDescriptionEn) error = 'short_description_en required';
      else if (priceRange && !VALID_PRICES.has(priceRange)) error = `invalid price_range: ${priceRange}`;
      else if (durationMinutes && isNaN(parseInt(durationMinutes))) error = 'invalid duration_minutes';

      return { nameEn, category, address, lat, lng, descriptionEn, shortDescriptionEn, tags, priceRange, durationMinutes, imageUrl, valid: !error, error };
    }).filter(r => r.nameEn || r.category); // skip completely blank lines
  }

  private splitCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }

  async importAttractions() {
    const valid = this.rows().filter(r => r.valid);
    if (!valid.length) return;

    this.importing.set(true);
    this.progress.set(0);

    // Send in batches of 25 to avoid timeouts
    const batchSize = 25;
    let imported = 0;

    try {
      for (let i = 0; i < valid.length; i += batchSize) {
        const batch = valid.slice(i, i + batchSize);
        const attractions = batch.map(r => ({
          name: { en: r.nameEn },
          description: { en: r.descriptionEn },
          shortDescription: { en: r.shortDescriptionEn },
          category: r.category,
          address: r.address,
          location: { lat: parseFloat(r.lat), lng: parseFloat(r.lng) },
          ...(r.tags ? { tags: r.tags.split(',').map(t => t.trim()).filter(Boolean) } : {}),
          ...(r.priceRange ? { priceRange: r.priceRange } : {}),
          ...(r.durationMinutes ? { durationMinutes: parseInt(r.durationMinutes) } : {}),
          ...(r.imageUrl ? { imageUrl: r.imageUrl } : {}),
          isActive: true,
        }));

        await firstValueFrom(this.api.post('attractions/bulk', { attractions }));
        imported += batch.length;
        this.progress.set(Math.round((imported / valid.length) * 100));
      }

      this.toast.show(`Successfully imported ${imported} attractions`, 'success');
      this.router.navigate(['/attractions']);
    } catch {
      this.toast.show('Import failed. Check your data and try again.', 'error');
      this.importing.set(false);
    }
  }
}
