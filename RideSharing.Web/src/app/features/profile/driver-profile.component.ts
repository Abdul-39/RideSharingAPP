import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-driver-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="rs-page">
      <header class="head">
        <div>
          <div class="chips">
            <span class="chip">Driver Profile</span>
            <span class="chip gold">{{ verifiedLabel() }}</span>
          </div>
          <h1>Driver &amp; availability</h1>
          <p class="sub">Control availability so passengers can match your corridor.</p>
        </div>
        <a routerLink="/app/vehicles" class="btn ghost">My Vehicles</a>
      </header>

      <section class="card avail">
        <div>
          <h2>Availability</h2>
          <p class="muted">When off, you will not appear in matching results.</p>
        </div>
        <label class="toggle">
          <input type="checkbox" [(ngModel)]="isAvailable" (ngModelChange)="saveAvailability()" />
          <span>{{ isAvailable ? 'Available' : 'Offline' }}</span>
        </label>
      </section>

      <section class="card">
        <h2>Driving information</h2>
        @if (err()) { <p class="err">{{ err() }}</p> }
        @if (msg()) { <p class="ok">{{ msg() }}</p> }

        <div class="row2">
          <label class="lbl">License number
            <input class="inp" [(ngModel)]="licenseNumber" name="lic" />
          </label>
        </div>
        <label class="lbl">Notes (optional)
          <input class="inp" [(ngModel)]="notes" name="notes" placeholder="Preferred corridors, vehicle hints…" />
        </label>
        <button type="button" class="btn primary" (click)="save()" [disabled]="busy()">Save profile</button>
      </section>

      <section class="card summary">
        <div class="row"><span>Verification</span><strong>{{ verifiedLabel() }}</strong></div>
        <div class="row"><span>License</span><strong>{{ licenseNumber || '—' }}</strong></div>
        <div class="row"><span>Experience</span><strong>{{ yearsOfExperience != null ? yearsOfExperience + ' yrs' : '—' }}</strong></div>
        <a routerLink="/app/verification" class="link">Go to Verification →</a>
      </section>
    </div>
  `,
  styles: [`
    .head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
    .chips { display: flex; gap: 0.35rem; flex-wrap: wrap; margin-bottom: 0.35rem; }
    .chip {
      font-size: 0.72rem; font-weight: 800; padding: 0.25rem 0.65rem; border-radius: 999px;
      background: #e8f8f1; color: #0b7f58;
    }
    .chip.gold { background: #fff7cc; color: #a16207; }
    h1 { margin: 0; font-size: 1.4rem; font-weight: 800; }
    h2 { margin: 0 0 0.45rem; font-size: 1.05rem; font-weight: 800; }
    .sub { margin: 0.3rem 0 0; color: #64748b; font-size: 0.9rem; }
    .card {
      background: #fff; border: 1px solid #b7ebc9; border-radius: 16px;
      padding: 1.15rem; margin-bottom: 0.9rem;
      box-shadow: 0 6px 18px rgba(15,23,42,0.04);
    }
    .avail { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .toggle {
      display: inline-flex; align-items: center; gap: 0.5rem; font-weight: 800;
      background: #e8f8f1; border: 1px solid #b7ebc9; border-radius: 999px; padding: 0.5rem 1rem;
    }
    .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem; }
    @media (max-width: 600px) { .row2 { grid-template-columns: 1fr; } }
    .lbl { display: block; font-size: 0.78rem; font-weight: 700; color: #64748b; margin-bottom: 0.55rem; }
    .inp {
      display: block; width: 100%; margin-top: 0.3rem; min-height: 44px;
      padding: 0.5rem 0.75rem; border-radius: 12px; border: 1px solid #e2e8f0;
    }
    .btn {
      display: inline-flex; align-items: center; min-height: 44px; padding: 0.5rem 1.1rem;
      border-radius: 999px; font-weight: 800; border: none; cursor: pointer; text-decoration: none;
    }
    .btn.primary { background: #0d9f6e; color: #fff; margin-top: 0.35rem; }
    .btn.ghost { background: #fff; border: 1px solid #e2e8f0; color: #0f172a; }
    .summary .row {
      display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid #f1f5f9;
    }
    .link { display: inline-block; margin-top: 0.75rem; color: #0d9f6e; font-weight: 700; }
    .muted { color: #64748b; } .err { color: #e11d48; } .ok { color: #0d9f6e; }
  `]
})
export class DriverProfileComponent implements OnInit {
  private http = inject(HttpClient);
  private api = (environment.apiUrl || '/api/v1').replace(/\/$/, '');

  isAvailable = false;
  licenseNumber = '';
  yearsOfExperience: number | null = null;
  notes = '';
  verificationStatus: any = null;
  busy = signal(false);
  err = signal('');
  msg = signal('');

  ngOnInit(): void {
    this.http.get<any>(`${this.api}/drivers/me`).subscribe({
      next: (r) => {
        const d = r?.data ?? r;
        this.isAvailable = !!(d?.isAvailable ?? d?.isActive);
        this.licenseNumber = d?.licenseNumber || d?.license || '';
        this.yearsOfExperience = d?.yearsOfExperience ?? null;
        this.notes = d?.notes || '';
        this.verificationStatus = d?.verificationStatus;
      },
      error: (e) => this.err.set(e.error?.message || 'Could not load driver profile')
    });
  }

  verifiedLabel(): string {
    const s = this.verificationStatus;
    if (s === 1 || s === 'Verified' || s === 'Approved') return 'Verified';
    if (s == null) return 'Pending';
    return String(s);
  }

  saveAvailability(): void {
    this.http.put(`${this.api}/drivers/me`, { isAvailable: this.isAvailable }).subscribe({
      next: () => this.msg.set(this.isAvailable ? 'You are available' : 'You are offline'),
      error: () => this.http.patch(`${this.api}/drivers/me/availability`, { isAvailable: this.isAvailable }).subscribe({
        next: () => this.msg.set('Availability updated'),
        error: (e) => this.err.set(e.error?.message || 'Update failed')
      })
    });
  }

  save(): void {
    this.busy.set(true); this.err.set(''); this.msg.set('');
    const body = {
      licenseNumber: this.licenseNumber,
      yearsOfExperience: this.yearsOfExperience,
      notes: this.notes,
      isAvailable: this.isAvailable
    };
    this.http.put<any>(`${this.api}/drivers/me`, body).subscribe({
      next: (r) => {
        this.busy.set(false);
        this.msg.set(r?.message || 'Profile saved');
      },
      error: (e) => {
        this.busy.set(false);
        this.err.set(e.error?.message || 'Save failed');
      }
    });
  }
}
