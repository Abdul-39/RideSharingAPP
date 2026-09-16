import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-verification-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="rs-page">
      <header class="head">
        <div>
          <div class="chips">
            <span class="chip">Institution Verification</span>
            <span class="chip gold">CNIC · Student / Employee ID</span>
          </div>
          <h1>Identity verification</h1>
          <p class="sub">Unlock trusted matching with institutional verification.</p>
        </div>
        <a routerLink="/app/dashboard" class="btn ghost">Dashboard</a>
      </header>

      <div class="grid">
        <section class="card status">
          <div class="shield">{{ status()?.isVerified ? '✓' : '?' }}</div>
          <h2>{{ status()?.isVerified ? 'Institution Verified' : 'Not verified yet' }}</h2>
          @if (status()?.institutionName) { <p class="muted">{{ status()?.institutionName }}</p> }
          @if (status()?.cnicLast4) { <p class="muted">CNIC ****{{ status()?.cnicLast4 }}</p> }
          @if (status()?.studentOrEmployeeId) { <p class="muted">ID: {{ status()?.studentOrEmployeeId }}</p> }
          @if (status()?.latestRequest; as lr) {
            <span class="chip">Latest: {{ lr.status }}</span>
            @if (lr.adminNote) { <p class="muted">Admin: {{ lr.adminNote }}</p> }
          }
        </section>

        <section class="card">
          <h2>Submit verification</h2>
          @if (err()) { <p class="err">{{ err() }}</p> }
          @if (msg()) { <p class="ok">{{ msg() }}</p> }
          <label class="lbl">Student / Employee ID
            <input class="inp" [(ngModel)]="studentId" name="sid" />
          </label>
          <label class="lbl">Institution
            <select class="inp" [(ngModel)]="institutionId" name="inst">
              <option value="">Optional</option>
              @for (i of institutions(); track i.id) {
                <option [value]="i.id">{{ i.name }}</option>
              }
            </select>
          </label>
          <label class="lbl">CNIC (only last 4 shown later)
            <input class="inp" [(ngModel)]="cnic" name="cnic" inputmode="numeric" />
          </label>
          <label class="lbl">Note
            <input class="inp" [(ngModel)]="note" name="note" />
          </label>
          <button type="button" class="btn primary full" (click)="submit()" [disabled]="busy()">Submit request</button>

          <hr />
          <h3>Upload document</h3>
          <select class="inp" [(ngModel)]="docType" name="dt">
            <option value="DrivingLicense">Driving License</option>
            <option value="Cnic">CNIC</option>
            <option value="VehicleRegistration">Vehicle Registration</option>
            <option value="StudentOrEmployeeId">Student/Employee ID</option>
            <option value="Other">Other</option>
          </select>
          <input type="file" accept="image/*,application/pdf" (change)="onFile($event)" />
          <button type="button" class="btn ghost full" (click)="upload()" [disabled]="!file || busy()">Upload</button>
        </section>
      </div>
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
    h2 { margin: 0.5rem 0; font-size: 1.1rem; font-weight: 800; }
    h3 { margin: 0.75rem 0 0.45rem; font-size: 0.95rem; }
    .sub { margin: 0.3rem 0 0; color: #64748b; font-size: 0.9rem; }
    .grid { display: grid; grid-template-columns: 1fr 1.2fr; gap: 0.9rem; }
    @media (max-width: 860px) { .grid { grid-template-columns: 1fr; } }
    .card {
      background: #fff; border: 1px solid #b7ebc9; border-radius: 16px; padding: 1.2rem;
      box-shadow: 0 6px 18px rgba(15,23,42,0.04);
    }
    .status { text-align: center; padding: 2rem 1rem; }
    .shield {
      width: 64px; height: 64px; margin: 0 auto; border-radius: 50%;
      background: #e8f8f1; color: #0d9f6e; display: grid; place-items: center;
      font-size: 1.5rem; font-weight: 800;
    }
    .lbl { display: block; margin: 0.55rem 0; font-size: 0.78rem; font-weight: 700; color: #64748b; }
    .inp {
      display: block; width: 100%; margin-top: 0.3rem; min-height: 44px;
      padding: 0.5rem 0.75rem; border-radius: 12px; border: 1px solid #e2e8f0;
    }
    .btn {
      display: inline-flex; align-items: center; justify-content: center; min-height: 44px;
      padding: 0.5rem 1.1rem; border-radius: 999px; font-weight: 800; border: none; cursor: pointer;
      text-decoration: none;
    }
    .btn.primary { background: #0d9f6e; color: #fff; }
    .btn.ghost { background: #fff; border: 1px solid #e2e8f0; color: #0f172a; }
    .full { width: 100%; margin-top: 0.45rem; }
    hr { border: none; border-top: 1px solid #e2e8f0; margin: 1rem 0; }
    input[type=file] { width: 100%; margin: 0.5rem 0; }
    .muted { color: #64748b; } .err { color: #e11d48; } .ok { color: #0d9f6e; }
  `]
})
export class VerificationPageComponent implements OnInit {
  private http = inject(HttpClient);
  private api = (environment.apiUrl || '/api/v1').replace(/\/$/, '');

  status = signal<any>(null);
  institutions = signal<any[]>([]);
  studentId = '';
  institutionId = '';
  cnic = '';
  note = '';
  docType = 'Cnic';
  file: File | null = null;
  busy = signal(false);
  msg = signal('');
  err = signal('');

  ngOnInit(): void {
    this.reload();
    this.http.get<any>(`${this.api}/institutions`).subscribe({
      next: (r) => {
        const d = r?.data ?? r;
        this.institutions.set(Array.isArray(d) ? d : d?.items ?? []);
      },
      error: () => {}
    });
  }

  reload(): void {
    this.http.get<any>(`${this.api}/verification/me`).subscribe({
      next: (r) => this.status.set(r?.data ?? r),
      error: () => {}
    });
  }

  submit(): void {
    this.busy.set(true); this.err.set(''); this.msg.set('');
    this.http.post<any>(`${this.api}/verification/requests`, {
      studentOrEmployeeId: this.studentId || undefined,
      institutionId: this.institutionId || undefined,
      cnic: this.cnic || undefined,
      applicantNote: this.note || undefined
    }).subscribe({
      next: (r) => {
        this.busy.set(false);
        this.msg.set(r?.message || 'Submitted');
        this.cnic = '';
        this.reload();
      },
      error: (e) => {
        this.busy.set(false);
        this.err.set(e.error?.message || 'Submit failed');
      }
    });
  }

  onFile(ev: Event): void {
    this.file = (ev.target as HTMLInputElement).files?.[0] || null;
  }

  upload(): void {
    if (!this.file) return;
    this.busy.set(true);
    const fd = new FormData();
    fd.append('file', this.file);
    fd.append('documentType', this.docType);
    const reqId = this.status()?.latestRequest?.id;
    if (reqId) fd.append('verificationRequestId', reqId);
    this.http.post<any>(`${this.api}/verification/documents`, fd).subscribe({
      next: (r) => {
        this.busy.set(false);
        this.msg.set(r?.message || 'Uploaded');
        this.file = null;
        this.reload();
      },
      error: (e) => {
        this.busy.set(false);
        this.err.set(e.error?.message || 'Upload failed');
      }
    });
  }
}
