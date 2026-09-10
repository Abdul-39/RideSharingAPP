import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="page">
      <div class="card">
        <div class="header">
          <h2>My Profile</h2>
          <a routerLink="/" class="back">← Home</a>
        </div>

        @if (error()) { <div class="alert error">{{ error() }}</div> }
        @if (success()) { <div class="alert ok">{{ success() }}</div> }

        <form [formGroup]="form" (ngSubmit)="save()">
          <div class="row">
            <div class="field"><label>First Name</label><input formControlName="firstName" /></div>
            <div class="field"><label>Last Name</label><input formControlName="lastName" /></div>
          </div>
          <div class="field"><label>Email</label><input [value]="email()" disabled /></div>
          <div class="field"><label>Phone</label><input formControlName="phoneNumber" placeholder="03XXXXXXXXX" /></div>
          <div class="field">
            <label>Gender</label>
            <select formControlName="gender">
              <option [value]="1">Male</option>
              <option [value]="2">Female</option>
              <option [value]="3">Other</option>
              <option [value]="4">Prefer not to say</option>
            </select>
          </div>
          <div class="field"><label>Date of Birth</label><input type="date" formControlName="dateOfBirth" /></div>
          <div class="field"><label>Roles</label><input [value]="roles()" disabled /></div>
          <button type="submit" [disabled]="form.invalid || saving()">{{ saving() ? 'Saving...' : 'Save Profile' }}</button>
        </form>

        <div class="upload">
          <label>Profile Image</label>
          <input type="file" accept="image/*" (change)="onFile($event)" />
          @if (imageUrl()) {
            <img [src]="apiHost + imageUrl()" alt="Profile" class="preview" />
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { min-height: 100vh; background: linear-gradient(135deg,#0f172a,#1e3a8a); padding: 2rem 1rem; display:flex; justify-content:center; }
    .card { background: rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:1rem; padding:1.75rem; width:100%; max-width:520px; color:#fff; }
    .header { display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; }
    .back { color:#60a5fa; font-size:0.9rem; }
    .row { display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; }
    .field { margin-bottom:0.85rem; }
    label { display:block; font-size:0.85rem; color:#cbd5e1; margin-bottom:0.3rem; }
    input, select { width:100%; padding:0.65rem 0.85rem; border-radius:0.5rem; border:1px solid rgba(255,255,255,0.2);
                    background:rgba(0,0,0,0.3); color:#fff; box-sizing:border-box; }
    input:disabled { opacity:0.6; }
    button { width:100%; padding:0.8rem; border:none; border-radius:0.5rem; background:#2563eb; color:#fff; font-weight:600; cursor:pointer; margin-top:0.5rem; }
    button:disabled { opacity:0.6; }
    .alert { padding:0.7rem; border-radius:0.5rem; margin-bottom:1rem; font-size:0.9rem; }
    .error { background:rgba(239,68,68,0.2); border:1px solid #ef4444; color:#fca5a5; }
    .ok { background:rgba(34,197,94,0.2); border:1px solid #22c55e; color:#86efac; }
    .upload { margin-top:1.5rem; padding-top:1rem; border-top:1px solid rgba(255,255,255,0.1); }
    .preview { max-width:120px; border-radius:0.5rem; margin-top:0.5rem; display:block; }
  `]
})
export class ProfileComponent implements OnInit {
  private userService = inject(UserService);
  private fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    phoneNumber: [''],
    gender: [1, Validators.required],
    dateOfBirth: ['']
  });

  email = signal('');
  roles = signal('');
  imageUrl = signal<string | null>(null);
  saving = signal(false);
  error = signal('');
  success = signal('');
  apiHost = ''; // relative paths work via proxy or same origin; for absolute set from env if needed

  ngOnInit(): void {
    this.userService.getMe().subscribe({
      next: res => {
        if (res.success && res.data) {
          const u = res.data;
          this.form.patchValue({
            firstName: u.firstName,
            lastName: u.lastName,
            phoneNumber: u.phoneNumber || '',
            gender: this.genderToNum(u.gender),
            dateOfBirth: u.dateOfBirth ? u.dateOfBirth.substring(0, 10) : ''
          });
          this.email.set(u.email);
          this.roles.set(u.roles?.join(', ') || '');
          this.imageUrl.set(u.profileImageUrl || null);
        }
      },
      error: () => this.error.set('Failed to load profile. Please login again.')
    });
  }

  genderToNum(g: string): number {
    const map: Record<string, number> = { Male: 1, Female: 2, Other: 3, PreferNotToSay: 4 };
    return map[g] ?? 1;
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.error.set('');
    this.success.set('');
    const v = this.form.getRawValue();
    this.userService.updateMe({
      firstName: v.firstName,
      lastName: v.lastName,
      phoneNumber: v.phoneNumber || undefined,
      gender: Number(v.gender),
      dateOfBirth: v.dateOfBirth || null
    }).subscribe({
      next: res => {
        this.saving.set(false);
        if (res.success) this.success.set('Profile updated.');
        else this.error.set(res.message);
      },
      error: err => {
        this.saving.set(false);
        this.error.set(err.error?.message || 'Update failed');
      }
    });
  }

  onFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.userService.uploadProfileImage(file).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.imageUrl.set(res.data.profileImageUrl || null);
          this.success.set('Image uploaded.');
        } else this.error.set(res.message);
      },
      error: err => this.error.set(err.error?.message || 'Upload failed')
    });
  }
}
