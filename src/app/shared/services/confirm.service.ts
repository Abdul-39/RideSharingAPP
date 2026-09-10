import { Injectable, signal } from '@angular/core';

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly active = signal<ConfirmRequest | null>(null);

  ask(title: string, message: string, opts?: { confirmText?: string; cancelText?: string; danger?: boolean }): Promise<boolean> {
    return new Promise(resolve => {
      this.active.set({
        title, message,
        confirmText: opts?.confirmText ?? 'Confirm',
        cancelText: opts?.cancelText ?? 'Cancel',
        danger: opts?.danger ?? false,
        resolve
      });
    });
  }

  close(ok: boolean): void {
    const req = this.active();
    if (req) {
      req.resolve(ok);
      this.active.set(null);
    }
  }
}
