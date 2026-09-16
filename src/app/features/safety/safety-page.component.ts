import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-safety-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="rs-page">
      <section class="sos-banner">
        <div>
          <div class="chips">
            <span class="chip red">Emergency SOS System</span>
            <span class="chip gold">Rescue 1122 Integration</span>
          </div>
          <h1>Emergency SOS Guardrails</h1>
          <p>
            During an active ride, tap SOS. The system stores ride ID, timestamp, and live GPS,
            and notifies registered contacts / system channels.
          </p>
        </div>
        <button type="button" class="btn sos" (click)="triggerSos()" [disabled]="sosBusy()">
          🛡 TRIGGER 1122 EMERGENCY SOS
        </button>
      </section>
      @if (sosMsg()) { <p class="ok">{{ sosMsg() }}</p> }
      @if (sosErr()) { <p class="err">{{ sosErr() }}</p> }

      <section class="card">
        <div class="pref-head">
          <div>
            <h2>Ride Matching Preferences</h2>
            <p class="muted">Safety score and demographic matching criteria.</p>
          </div>
          <div class="meta">Gender: {{ genderLabel() }}</div>
        </div>
        <label class="check">
          <input type="checkbox" [(ngModel)]="womenOnly" [disabled]="!canWomenOnly()" />
          <span>
            <strong>Women-only ride matching</strong>
            <small>Only female accounts can enable this. (Disabled for incompatible accounts)</small>
          </span>
        </label>
        <button type="button" class="btn primary" (click)="savePref()" [disabled]="prefBusy()">Save Preference</button>
        @if (prefMsg()) { <p class="ok">{{ prefMsg() }}</p> }
      </section>

      <section class="card">
        <h2>Emergency Contacts</h2>
        <p class="muted">Kin and institution safety coordinators notified when SOS triggers.</p>
        <div class="contacts">
          @for (c of contacts(); track c.id || c.phoneNumber) {
            <article class="contact">
              <div>
                <strong>{{ c.name }}</strong>
                @if (c.isPrimary) { <span class="chip gold">Primary</span> }
                <p class="muted">{{ c.phoneNumber }} · {{ c.relationship || 'Contact' }}</p>
              </div>
              <button type="button" class="x" (click)="removeContact(c)" title="Remove">🗑</button>
            </article>
          } @empty {
            <p class="muted">No contacts yet. Add family or campus security.</p>
          }
        </div>

        <h3>Add Emergency Contact</h3>
        <div class="row3">
          <label class="lbl">Name
            <input class="inp" [(ngModel)]="newName" name="n" placeholder="Tariq Khan (Father)" />
          </label>
          <label class="lbl">Phone
            <input class="inp" [(ngModel)]="newPhone" name="p" placeholder="0300XXXXXXX" />
          </label>
          <label class="lbl">Relationship
            <select class="inp" [(ngModel)]="newRel" name="r">
              <option>Parent</option>
              <option>Sibling</option>
              <option>Spouse</option>
              <option>Friend</option>
              <option>Institution Safety</option>
              <option>Other</option>
            </select>
          </label>
        </div>
        <label class="check">
          <input type="checkbox" [(ngModel)]="newPrimary" />
          <span>Set as primary emergency contact</span>
        </label>
        <button type="button" class="btn primary" (click)="addContact()" [disabled]="contactBusy()">+ Add Contact</button>
        @if (contactErr()) { <p class="err">{{ contactErr() }}</p> }
      </section>

      <p class="hint">Active ride SOS also appears on Ride Detail and the top SOS PANIC button.</p>
    </div>
  `,
  styles: [`
    .sos-banner {
      display: flex; flex-wrap: wrap; justify-content: space-between; gap: 1rem;
      background: #fff1f2; border: 1px solid #fecdd3; border-radius: 18px;
      padding: 1.25rem 1.35rem; margin-bottom: 1rem;
    }
    .chips { display: flex; gap: 0.35rem; flex-wrap: wrap; margin-bottom: 0.4rem; }
    .chip {
      font-size: 0.72rem; font-weight: 800; padding: 0.25rem 0.65rem; border-radius: 999px;
      background: #e8f8f1; color: #0b7f58;
    }
    .chip.red { background: #ffe4e6; color: #be123c; }
    .chip.gold { background: #fff7cc; color: #a16207; }
    h1 { margin: 0; font-size: 1.35rem; font-weight: 800; color: #9f1239; }
    h2 { margin: 0 0 0.35rem; font-size: 1.05rem; font-weight: 800; }
    h3 { margin: 1rem 0 0.5rem; font-size: 0.95rem; font-weight: 800; }
    .sos-banner p { margin: 0.4rem 0 0; color: #9f1239; max-width: 36rem; font-size: 0.9rem; line-height: 1.45; }
    .btn {
      display: inline-flex; align-items: center; justify-content: center; min-height: 46px;
      padding: 0.55rem 1.15rem; border-radius: 999px; font-weight: 800; font-size: 0.85rem;
      border: none; cursor: pointer;
    }
    .btn.sos { background: #e11d48; color: #fff; white-space: normal; text-align: center; max-width: 260px; }
    .btn.primary { background: #0d9f6e; color: #fff; margin-top: 0.65rem; }
    .btn:disabled { opacity: 0.6; }
    .card {
      background: #fff; border: 1px solid #b7ebc9; border-radius: 16px;
      padding: 1.15rem; margin-bottom: 0.9rem;
      box-shadow: 0 6px 18px rgba(15,23,42,0.04);
    }
    .pref-head { display: flex; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.75rem; }
    .check {
      display: flex; gap: 0.65rem; align-items: flex-start; padding: 0.85rem;
      border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 0.5rem;
    }
    .check strong { display: block; }
    .check small { display: block; color: #64748b; font-size: 0.8rem; margin-top: 0.15rem; }
    .contacts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.65rem; margin: 0.75rem 0; }
    @media (max-width: 900px) { .contacts { grid-template-columns: 1fr; } }
    .contact {
      display: flex; justify-content: space-between; gap: 0.5rem;
      border: 1px solid #e2e8f0; border-radius: 14px; padding: 0.85rem;
    }
    .x { border: none; background: transparent; cursor: pointer; font-size: 1rem; }
    .row3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.55rem; }
    @media (max-width: 700px) { .row3 { grid-template-columns: 1fr; } }
    .lbl { display: block; font-size: 0.78rem; font-weight: 700; color: #64748b; }
    .inp {
      display: block; width: 100%; margin-top: 0.3rem; min-height: 44px;
      padding: 0.5rem 0.75rem; border-radius: 12px; border: 1px solid #e2e8f0;
    }
    .muted { color: #64748b; font-size: 0.88rem; }
    .hint { color: #64748b; font-size: 0.85rem; }
    .err { color: #e11d48; } .ok { color: #0d9f6e; }
  `]
})
export class SafetyPageComponent implements OnInit {
  private http = inject(HttpClient);
  private api = (environment.apiUrl || '/api/v1').replace(/\/$/, '');

  contacts = signal<any[]>([]);
  womenOnly = false;
  gender = '';
  newName = '';
  newPhone = '';
  newRel = 'Parent';
  newPrimary = false;
  sosBusy = signal(false);
  prefBusy = signal(false);
  contactBusy = signal(false);
  sosMsg = signal('');
  sosErr = signal('');
  prefMsg = signal('');
  contactErr = signal('');

  ngOnInit(): void {
    this.loadContacts();
    this.http.get<any>(`${this.api}/users/me`).subscribe({
      next: (r) => {
        const d = r?.data ?? r;
        this.gender = d?.gender ?? '';
        this.womenOnly = !!(d?.womenOnlyPreference || d?.womenOnly);
      },
      error: () => {}
    });
  }

  loadContacts(): void {
    this.http.get<any>(`${this.api}/safety/emergency-contacts`).subscribe({
      next: (r) => {
        const d = r?.data ?? r;
        this.contacts.set(Array.isArray(d) ? d : d?.items ?? []);
      },
      error: () => {
        this.http.get<any>(`${this.api}/emergency-contacts`).subscribe({
          next: (r) => {
            const d = r?.data ?? r;
            this.contacts.set(Array.isArray(d) ? d : d?.items ?? []);
          },
          error: () => {}
        });
      }
    });
  }

  canWomenOnly(): boolean {
    const g = String(this.gender).toLowerCase();
    return g === 'female' || g === '2' || g === 'f';
  }

  genderLabel(): string {
    const g = String(this.gender);
    if (!g) return '—';
    if (g === '1' || g.toLowerCase() === 'male') return 'Male';
    if (g === '2' || g.toLowerCase() === 'female') return 'Female';
    return g;
  }

  triggerSos(): void {
    if (!confirm('Trigger emergency SOS? This will notify your contacts and system.')) return;
    this.sosBusy.set(true); this.sosErr.set(''); this.sosMsg.set('');
    navigator.geolocation.getCurrentPosition(
      (pos) => this.postSos(pos.coords.latitude, pos.coords.longitude),
      () => this.postSos(undefined, undefined),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  private postSos(lat?: number, lng?: number): void {
    const body = { latitude: lat, longitude: lng, note: 'SOS from Safety page' };
    this.http.post<any>(`${this.api}/safety/sos`, body).subscribe({
      next: (r) => {
        this.sosBusy.set(false);
        this.sosMsg.set(r?.message || 'SOS alert created');
      },
      error: (e) => {
        this.http.post<any>(`${this.api}/sos`, body).subscribe({
          next: (r) => {
            this.sosBusy.set(false);
            this.sosMsg.set(r?.message || 'SOS alert created');
          },
          error: (e2) => {
            this.sosBusy.set(false);
            this.sosErr.set(e2.error?.message || e.error?.message || 'SOS failed');
          }
        });
      }
    });
  }

  savePref(): void {
    this.prefBusy.set(true); this.prefMsg.set('');
    this.http.put<any>(`${this.api}/users/me`, { womenOnlyPreference: this.womenOnly }).subscribe({
      next: () => {
        this.prefBusy.set(false);
        this.prefMsg.set('Preference saved');
      },
      error: () => {
        this.prefBusy.set(false);
        this.prefMsg.set('Could not save (endpoint optional)');
      }
    });
  }

  addContact(): void {
    if (!this.newName || !this.newPhone) {
      this.contactErr.set('Name and phone required');
      return;
    }
    this.contactBusy.set(true); this.contactErr.set('');
    const body = {
      name: this.newName,
      phoneNumber: this.newPhone,
      relationship: this.newRel,
      isPrimary: this.newPrimary
    };
    this.http.post<any>(`${this.api}/safety/emergency-contacts`, body).subscribe({
      next: () => {
        this.contactBusy.set(false);
        this.newName = ''; this.newPhone = ''; this.newPrimary = false;
        this.loadContacts();
      },
      error: (e) => {
        this.http.post(`${this.api}/emergency-contacts`, body).subscribe({
          next: () => {
            this.contactBusy.set(false);
            this.loadContacts();
          },
          error: (e2) => {
            this.contactBusy.set(false);
            this.contactErr.set(e2.error?.message || e.error?.message || 'Add failed');
          }
        });
      }
    });
  }

  removeContact(c: any): void {
    const id = c.id;
    if (!id || !confirm('Remove contact?')) return;
    this.http.delete(`${this.api}/safety/emergency-contacts/${id}`).subscribe({
      next: () => this.loadContacts(),
      error: () => {
        this.http.delete(`${this.api}/emergency-contacts/${id}`).subscribe({
          next: () => this.loadContacts(),
          error: () => {}
        });
      }
    });
  }
}
