import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-host" aria-live="polite">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast" [class]="t.type" (click)="toast.dismiss(t.id)">
          <span class="icon">
            @switch (t.type) {
              @case ('success') { ✓ }
              @case ('error') { ! }
              @case ('warning') { ⚠ }
              @default { i }
            }
          </span>
          <span>{{ t.message }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-host {
      position: fixed; bottom: 1.25rem; right: 1.25rem; z-index: 9999;
      display: flex; flex-direction: column; gap: 0.5rem; max-width: min(360px, 92vw);
    }
    .toast {
      display: flex; align-items: flex-start; gap: 0.65rem;
      padding: 0.85rem 1rem; border-radius: 0.85rem; font-size: 0.9rem;
      backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.12);
      box-shadow: 0 12px 40px rgba(0,0,0,0.35); cursor: pointer;
      animation: slideIn 0.28s ease;
      background: rgba(15,23,42,0.92); color: #f1f5f9;
    }
    .toast.success { border-color: rgba(52,211,153,0.4); }
    .toast.error { border-color: rgba(248,113,113,0.45); }
    .toast.warning { border-color: rgba(251,191,36,0.4); }
    .toast.info { border-color: rgba(96,165,250,0.4); }
    .icon {
      width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center;
      font-size: 0.75rem; font-weight: 700; flex-shrink: 0;
      background: rgba(255,255,255,0.1);
    }
    .success .icon { background: rgba(52,211,153,0.25); color: #6ee7b7; }
    .error .icon { background: rgba(248,113,113,0.25); color: #fca5a5; }
    .warning .icon { background: rgba(251,191,36,0.25); color: #fcd34d; }
    .info .icon { background: rgba(96,165,250,0.25); color: #93c5fd; }
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class ToastContainerComponent {
  toast = inject(ToastService);
}
