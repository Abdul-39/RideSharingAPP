import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DriverService } from '../../core/services/driver.service';

@Component({
  selector: 'app-driver-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="page">
      <div class="card">
        <div class="header">
          <h2>Driver Profile</h2>
          <a routerLink="/" class="back">← Home</a>
        </div>
        @if (error()) { <div class="alert error">{{ error() }}</div> }
        @if (success()) { <div class="alert ok">{{ success() }}</div> }
        <p class="meta">{{ fullName() }} · {{ email() }}</p>
        <p class="status">Verification: <strong>{{ verification() }}</strong></p>

        <form [formGroup]="form" (ngSubmit)="save()">
          <div class="field"><label>License Number</label><input formControlName="licenseNumber" /></div>
          <div class="field"><label>License Expiry</label><input type="date" formControlName="licenseExpiryDate" /></div>
          <div class="field"><label>Years of Experience</label><input type="number" formControlName="yearsOfExperience" min="0" /></div>
          <div class="field check">
            <label><input type="checkbox" formControlName="isAvailable" /> Available for rides</label>
          </div>
          <div class="field"><label>Notes</label><textarea formControlName="notes" rows="3"></textarea></div>
          <button type="submit" [disabled]="form.invalid || saving()">{{ saving() ? 'Saving...' : 'Save Driver Profile' }}</button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .page { min-height:100vh; background:linear-gradient(135deg,#0f172a,#1e3a8a); padding:2rem 1rem; display:flex; justify-content:center; }
    .card { background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:1rem; padding:1.75rem; width:100%; max-width:520px; color:#fff; }
    .header { display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; }
    .back { color:#60a5fa; font-size:0.9rem; }
    .meta, .status { color:#94a3b8; font-size:0.9rem; margin-bottom:0.5rem; }
    .field { margin-bottom:0.85rem; }
    label { display:block; font-size:0.85rem; color:#cbd5e1; margin-bottom:0.3rem; }
    input, textarea { width:100%; padding:0.65rem 0.85rem; border-radius:0.5rem; border:1px solid rgba(255,255,255,0.2);
                      background:rgba(0,0,0,0.3); color:#fff; box-sizing:border-box; }
    .check label { display:flex; align-items:center; gap:0.5rem; }
    .check input { width:auto; }
    button { width:100%; padding:0.8rem; border:none; border-radius:0.5rem; background:#2563eb; color:#fff; font-weight:600; cursor:pointer; }
    .alert { padding:0.7rem; border-radius:0.5rem; margin-bottom:1rem; font-size:0.9rem; }
    .error { background:rgba(239,68,68,0.2); border:1px solid #ef4444; color:#fca5a5; }
    .ok { background:rgba(34,197,94,0.2); border:1px solid #22c55e; color:#86efac; }
  `]
})
export class DriverProfileComponent implements OnInit {
  private driverService = inject(DriverService);
  private fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    licenseNumber: [''],
    licenseExpiryDate: [''],
    yearsOfExperience: [0, [Validators.required, Validators.min(0)]],
    isAvailable: [true],
    notes: ['']
  });

  fullName = signal('');
  email = signal('');
  verification = signal('Pending');
  saving = signal(false);
  error = signal('');
  success = signal('');

  ngOnInit(): void {
    this.driverService.getMe().subscribe({
      next: res => {
        if (res.success && res.data) {
          const d = res.data;
          this.fullName.set(d.fullName);
          this.email.set(d.email);
          this.verification.set(d.verificationStatus);
          this.form.patchValue({
            licenseNumber: d.licenseNumber || '',
            licenseExpiryDate: d.licenseExpiryDate ? d.licenseExpiryDate.substring(0, 10) : '',
            yearsOfExperience: d.yearsOfExperience || 0,
            isAvailable: d.isAvailable,
            notes: d.notes || ''
          });
        } else this.error.set(res.message);
      },
      error: err => this.error.set(err.error?.message || 'Failed to load driver profile (Driver role required).')
    });
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.error.set('');
    this.success.set('');
    const v = this.form.getRawValue();
    this.driverService.updateMe({
      licenseNumber: v.licenseNumber || undefined,
      licenseExpiryDate: v.licenseExpiryDate || null,
      yearsOfExperience: Number(v.yearsOfExperience),
      isAvailable: v.isAvailable,
      notes: v.notes || undefined
    }).subscribe({
      next: res => {
        this.saving.set(false);
        if (res.success) {
          this.success.set('Driver profile saved.');
          if (res.data) this.verification.set(res.data.verificationStatus);
        } else this.error.set(res.message);
      },
      error: err => {
        this.saving.set(false);
        this.error.set(err.error?.message || 'Save failed');
      }
    });
  }
}
