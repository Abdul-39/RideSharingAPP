import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmService } from '../services/confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (confirm.active(); as d) {
      <div class="backdrop" (click)="confirm.close(false)">
        <div class="dialog" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
          <h3>{{ d.title }}</h3>
          <p>{{ d.message }}</p>
          <div class="actions">
            <button type="button" class="btn ghost" (click)="confirm.close(false)">{{ d.cancelText }}</button>
            <button type="button" class="btn" [class.danger]="d.danger" (click)="confirm.close(true)">{{ d.confirmText }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .backdrop {
      position: fixed; inset: 0; z-index: 10000;
      background: rgba(2,6,23,0.7); backdrop-filter: blur(6px);
      display: grid; place-items: center; padding: 1rem;
      animation: fade 0.2s ease;
    }
    .dialog {
      width: min(400px, 100%); background: #0f172a; border: 1px solid rgba(255,255,255,0.12);
      border-radius: 1.15rem; padding: 1.5rem; box-shadow: 0 24px 60px rgba(0,0,0,0.5);
      animation: pop 0.22s ease;
    }
    h3 { margin: 0 0 0.5rem; font-size: 1.15rem; color: #f8fafc; }
    p { margin: 0 0 1.25rem; color: #94a3b8; font-size: 0.92rem; line-height: 1.5; }
    .actions { display: flex; justify-content: flex-end; gap: 0.5rem; }
    .btn {
      padding: 0.55rem 1.1rem; border-radius: 999px; border: none; font-weight: 600;
      cursor: pointer; background: linear-gradient(135deg,#5b8cff,#7c5cff); color: #fff;
    }
    .btn.ghost { background: transparent; border: 1px solid rgba(255,255,255,0.15); color: #e2e8f0; }
    .btn.danger { background: linear-gradient(135deg,#b91c1c,#f87171); }
    @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes pop { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
  `]
})
export class ConfirmDialogComponent {
  confirm = inject(ConfirmService);
}
