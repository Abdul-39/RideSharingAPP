import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SafetyApiService, SafetySettingsDto, EmergencyContactDto } from '../../core/services/safety.service';

@Component({
  selector: 'app-safety-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <header>
        <h1>Safety</h1>
        <p>Women-only preference, emergency contacts, ratings</p>
      </header>

      <section class="card">
        <h2>Preferences</h2>
        @if (settings(); as s) {
          <p class="muted">Gender: {{ s.gender }} · Rating: {{ s.averageRating ?? '—' }} ({{ s.ratingCount }} reviews)</p>
          @if (s.isFlaggedForReview) {
            <p class="warn">Account flagged for review (not banned). An admin can review later.</p>
          }
          <label class="check">
            <input type="checkbox" [(ngModel)]="womenOnly" [disabled]="s.gender !== 'Female'" />
            Women-only ride matching
          </label>
          <p class="hint" *ngIf="s.gender !== 'Female'">Only female accounts can enable women-only matching.</p>
          <button type="button" class="btn" (click)="saveSettings()">Save preference</button>
        }
        @if (msg()) { <p class="ok">{{ msg() }}</p> }
        @if (err()) { <p class="err">{{ err() }}</p> }
      </section>

      <section class="card">
        <h2>Emergency contacts</h2>
        <div class="form">
          <input [(ngModel)]="cName" placeholder="Name" />
          <input [(ngModel)]="cPhone" placeholder="Phone" />
          <input [(ngModel)]="cRel" placeholder="Relationship (optional)" />
          <label class="check"><input type="checkbox" [(ngModel)]="cPrimary" /> Primary</label>
          <button type="button" class="btn" (click)="addContact()">Add</button>
        </div>
        @for (c of contacts(); track c.id) {
          <div class="row">
            <div>
              <strong>{{ c.name }}</strong> {{ c.isPrimary ? '· Primary' : '' }}
              <span>{{ c.phoneNumber }} · {{ c.relationship || '' }}</span>
            </div>
            <button type="button" class="btn ghost" (click)="remove(c.id)">Remove</button>
          </div>
        } @empty {
          <p class="muted">No contacts yet.</p>
        }
      </section>
    </div>
  `,
  styles: [`
    .page { max-width: 640px; margin: 0 auto; }
    header { margin-bottom: 1rem; }
    h1 { margin: 0; }
    header p, .muted, .hint { color: #94a3b8; font-size: 0.88rem; }
    .card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
      border-radius: 1.1rem; padding: 1.15rem; margin-bottom: 1rem; }
    h2 { margin: 0 0 0.75rem; font-size: 1rem; }
    .check { display: flex; align-items: center; gap: 0.4rem; margin: 0.5rem 0; color: #e2e8f0; }
    .btn { padding: 0.5rem 1rem; border: none; border-radius: 999px; font-weight: 600; cursor: pointer;
      background: linear-gradient(135deg,#5b8cff,#7c5cff); color: #fff; margin-top: 0.5rem; }
    .btn.ghost { background: transparent; border: 1px solid rgba(255,255,255,0.15); color: #e2e8f0; }
    .form { display: grid; gap: 0.45rem; margin-bottom: 0.75rem; }
    input { padding: 0.5rem 0.7rem; border-radius: 0.65rem; border: 1px solid rgba(255,255,255,0.12);
      background: rgba(0,0,0,0.3); color: #fff; }
    .row { display: flex; justify-content: space-between; gap: 0.5rem; padding: 0.55rem 0;
      border-bottom: 1px solid rgba(255,255,255,0.06); }
    .row span { display: block; font-size: 0.8rem; color: #94a3b8; }
    .ok { color: #6ee7b7; } .err { color: #fca5a5; } .warn { color: #fbbf24; }
  `]
})
export class SafetyPageComponent implements OnInit {
  private api = inject(SafetyApiService);
  settings = signal<SafetySettingsDto | null>(null);
  contacts = signal<EmergencyContactDto[]>([]);
  womenOnly = false;
  cName = ''; cPhone = ''; cRel = ''; cPrimary = false;
  msg = signal(''); err = signal('');

  ngOnInit(): void {
    this.api.getSettings().subscribe({
      next: r => {
        if (r.success && r.data) {
          this.settings.set(r.data);
          this.womenOnly = r.data.womenOnlyPreference;
        }
      }
    });
    this.reloadContacts();
  }

  reloadContacts(): void {
    this.api.getContacts().subscribe({ next: r => { if (r.success && r.data) this.contacts.set(r.data); } });
  }

  saveSettings(): void {
    this.msg.set(''); this.err.set('');
    this.api.updateSettings(this.womenOnly).subscribe({
      next: r => {
        if (r.success && r.data) { this.settings.set(r.data); this.msg.set('Saved'); }
        else this.err.set(r.message);
      },
      error: e => this.err.set(e.error?.message || 'Failed')
    });
  }

  addContact(): void {
    this.api.addContact({
      name: this.cName, phoneNumber: this.cPhone, relationship: this.cRel || undefined, isPrimary: this.cPrimary
    }).subscribe({
      next: r => {
        if (r.success) { this.cName = ''; this.cPhone = ''; this.cRel = ''; this.cPrimary = false; this.reloadContacts(); }
        else this.err.set(r.message);
      },
      error: e => this.err.set(e.error?.message || 'Failed')
    });
  }

  remove(id: string): void {
    this.api.deleteContact(id).subscribe({ next: () => this.reloadContacts() });
  }
}
