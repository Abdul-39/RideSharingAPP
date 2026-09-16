import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="rs-page">
      <header class="head">
        <div>
          <div class="chips"><span class="chip">My Profile</span></div>
          <h1>Account settings</h1>
          <p class="sub">Name, phone, gender and institution preferences.</p>
        </div>
        <a routerLink="/app/driver-profile" class="btn ghost">Driver profile</a>
      </header>

      <section class="card">
        @if (err()) { <p class="err">{{ err() }}</p> }
        @if (msg()) { <p class="ok">{{ msg() }}</p> }

        <div class="row2">
          <label class="lbl">First name
            <input class="inp" [(ngModel)]="firstName" name="fn" />
          </label>
          <label class="lbl">Last name
            <input class="inp" [(ngModel)]="lastName" name="ln" />
          </label>
        </div>
        <label class="lbl">Email
          <input class="inp" [ngModel]="email" name="em" disabled />
        </label>
        <label class="lbl">Phone
          <input class="inp" [(ngModel)]="phone" name="ph" />
        </label>
        <label class="lbl">Gender
          <select class="inp" [(ngModel)]="gender" name="g">
            <option value="">—</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="1">Male (1)</option>
            <option value="2">Female (2)</option>
          </select>
        </label>
        <button type="button" class="btn primary" (click)="save()" [disabled]="busy()">Save profile</button>
      </section>
    </div>
  `,
  styles: [`
    .head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
    .chip {
      font-size: 0.72rem; font-weight: 800; padding: 0.25rem 0.65rem; border-radius: 999px;
      background: #e8f8f1; color: #0b7f58;
    }
    h1 { margin: 0.35rem 0 0; font-size: 1.4rem; font-weight: 800; }
    .sub { margin: 0.3rem 0 0; color: #64748b; font-size: 0.9rem; }
    .card {
      background: #fff; border: 1px solid #b7ebc9; border-radius: 16px; padding: 1.2rem;
      box-shadow: 0 6px 18px rgba(15,23,42,0.04); max-width: 560px;
    }
    .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem; }
    @media (max-width: 560px) { .row2 { grid-template-columns: 1fr; } }
    .lbl { display: block; font-size: 0.78rem; font-weight: 700; color: #64748b; margin-bottom: 0.65rem; }
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
    .err { color: #e11d48; } .ok { color: #0d9f6e; }
  `]
})
export class ProfileComponent implements OnInit {
  private http = inject(HttpClient);
  private api = (environment.apiUrl || '/api/v1').replace(/\/$/, '');

  firstName = '';
  lastName = '';
  email = '';
  phone = '';
  gender = '';
  busy = signal(false);
  err = signal('');
  msg = signal('');

  ngOnInit(): void {
    this.http.get<any>(`${this.api}/users/me`).subscribe({
      next: (r) => {
        const d = r?.data ?? r;
        this.firstName = d?.firstName || '';
        this.lastName = d?.lastName || '';
        this.email = d?.email || '';
        this.phone = d?.phoneNumber || d?.phone || '';
        const g = d?.gender;
        this.gender = g == null ? '' : String(g);
      },
      error: (e) => this.err.set(e.error?.message || 'Could not load profile')
    });
  }

  save(): void {
    this.busy.set(true); this.err.set(''); this.msg.set('');
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    this.http.put(`${this.api}/users/me`, {
      firstName: this.firstName,
      lastName: this.lastName,
      phoneNumber: this.phone,
      gender: this.gender || undefined
    }, { headers }).subscribe({
      next: () => {
        this.busy.set(false);
        this.msg.set('Profile saved');
      },
      error: (e) => {
        this.busy.set(false);
        this.err.set(e.error?.message || 'Save failed');
      }
    });
  }
}
