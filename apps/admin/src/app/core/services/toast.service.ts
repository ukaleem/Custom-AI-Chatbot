import { Injectable, signal } from '@angular/core';

export interface Toast { message: string; type: 'success' | 'error'; id: number; }

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private counter = 0;

  show(message: string, type: 'success' | 'error' = 'success') {
    const id = ++this.counter;
    this.toasts.update(t => [...t, { message, type, id }]);
    setTimeout(() => this.toasts.update(t => t.filter(x => x.id !== id)), 4000);
  }

  success(message: string) { this.show(message, 'success'); }
  error(message: string) { this.show(message, 'error'); }
}
