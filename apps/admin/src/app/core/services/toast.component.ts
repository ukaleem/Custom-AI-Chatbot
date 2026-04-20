import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    @for (toast of toastService.toasts(); track toast.id) {
      <div class="toast" [class]="toast.type">{{ toast.message }}</div>
    }
  `,
})
export class ToastComponent {
  readonly toastService = inject(ToastService);
}
