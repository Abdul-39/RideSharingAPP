import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';

/**
 * Role-aware payments:
 * - Passenger: choose ride → pay (Cash / Wallet / JazzCash / EasyPaisa)
 * - Driver: see money received (pending / completed) — no "pay" form
 */
@Component({
  selector: 'app-payment-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="rs-page">
      <header class="head">
        <div>
          <div class="chips">
            <span class="chip">Payments</span>
            @if (isDriver() && !isPassengerOnly()) {
              <span class="chip gold">Driver · Earnings</span>
            } @else {
              <span class="chip gold">Passenger · Pay rides</span>
            }
          </div>
          <h1>{{ isDriverView() ? 'Earnings & received payments' : 'Pay your ride' }}</h1>
          <p class="sub">
            @if (isDriverView()) {
              See what passengers paid you — pending or completed.
            } @else {
              Select a ride and pay. Driver is recorded as payee automatically.
            }
          </p>
        </div>
        <a routerLink="/app/wallet" class="btn ghost">Open wallet</a>
      </header>

      <!-- ========== DRIVER VIEW ========== -->
      @if (isDriverView()) {
        <section class="card stats">
          <div class="stat">
            <span class="muted">Completed</span>
            <strong class="ok">Rs. {{ driverTotals().completed }}</strong>
          </div>
          <div class="stat">
            <span class="muted">Pending</span>
            <strong class="warn">Rs. {{ driverTotals().pending }}</strong>
          </div>
          <div class="stat">
            <span class="muted">Payments</span>
            <strong>{{ receivedPayments().length }}</strong>
          </div>
        </section>

        <section class="card">
          <div class="row-head">
            <h2>Received from passengers</h2>
            <button type="button" class="btn ghost sm" (click)="reloadPayments()" [disabled]="busy()">Refresh</button>
          </div>
          @if (err()) { <p class="err">{{ err() }}</p> }
          @for (p of receivedPayments(); track p.id || $index) {
            <div class="row">
              <div>
                <strong>{{ p.method || 'Payment' }}</strong>
                <span class="badge" [class.done]="isCompleted(p)" [class.pend]="isPending(p)">
                  {{ p.status }}
                </span>
                <p class="muted">
                  Ride {{ shortId(p.rideId) }}
                  @if (p.providerReference) { · {{ p.providerReference }} }
                  · {{ p.createdAt | date:'short' }}
                </p>
              </div>
              <strong [class.ok]="isCompleted(p)">Rs. {{ p.amount ?? '—' }}</strong>
            </div>
          } @empty {
            <p class="muted">No payments received yet. When a passenger pays for your ride, it appears here.</p>
          }
        </section>

        @if (isAlsoPassenger()) {
          <p class="hint">You also have Passenger role — scroll down to pay for rides you took as passenger.</p>
        }
      }

      <!-- ========== PASSENGER PAY (hidden for pure driver) ========== -->
      @if (!isDriverView() || isAlsoPassenger()) {
        @if (isAlsoPassenger() && isDriverView()) {
          <header class="subhead"><h2>Pay as passenger</h2></header>
        }

        <section class="card">
          <h2>1. Choose ride</h2>
          @if (loadErr()) { <p class="err">{{ loadErr() }}</p> }
          @if (rides().length === 0 && !loadingRides()) {
            <p class="muted">No payable rides. Complete a ride first.</p>
            <a routerLink="/app/rides/lifecycle" class="btn ghost">My Rides</a>
          } @else {
            <label class="lbl">Your rides
              <select class="inp" [(ngModel)]="selectedRideId" name="ride" (ngModelChange)="onRideChange()">
                <option value="">— Select ride —</option>
                @for (r of rides(); track r.id) {
                  <option [value]="r.id">{{ rideLabel(r) }}</option>
                }
              </select>
            </label>
            @if (fare()) {
              <div class="fare-box">
                <span>Your share</span>
                <strong>Rs. {{ fare()!.sharedFarePerPassenger ?? fare()!.sharedFare ?? fare()!.totalFare }}</strong>
                <small class="muted">{{ fare()!.currency || 'PKR' }}</small>
              </div>
            }
          }
        </section>

        <section class="card">
          <h2>2. Pay</h2>
          @if (err() && !isDriverView()) { <p class="err">{{ err() }}</p> }
          @if (msg()) { <p class="ok">{{ msg() }}</p> }

          <label class="lbl">Method
            <select class="inp" [(ngModel)]="method" name="m" (ngModelChange)="onMethodChange()">
              <option value="Cash">Cash (pay driver in person)</option>
              <option value="MockWallet">Mock Wallet</option>
              <option value="JazzCash">JazzCash</option>
              <option value="EasyPaisa">EasyPaisa</option>
            </select>
          </label>

          @if (needsMobile()) {
            <label class="lbl">{{ method }} mobile (03XXXXXXXXX)
              <input class="inp" [(ngModel)]="mobileAccount" name="mob" placeholder="03001234567" />
            </label>
          }

          @if (!showOtp()) {
            <button type="button" class="btn primary" (click)="pay()" [disabled]="busy() || !selectedRideId">
              {{ payButtonLabel() }}
            </button>
          } @else {
            <div class="otp-box">
              <p class="muted">OTP sent to {{ mobileMasked || 'your number' }}.</p>
              <label class="lbl">OTP
                <input class="inp" [(ngModel)]="otp" name="otp" maxlength="6" placeholder="123456" />
              </label>
              <button type="button" class="btn primary" (click)="confirmOtp()" [disabled]="busy() || otp.length < 4">
                Verify OTP &amp; complete
              </button>
              <button type="button" class="btn ghost" (click)="cancelOtp()">Cancel</button>
            </div>
          }
        </section>

        <section class="card">
          <h2>My payments (as passenger)</h2>
          @for (p of paidByMe(); track p.id || $index) {
            <div class="row">
              <div>
                <strong>{{ p.method || 'Payment' }}</strong>
                <span class="badge" [class.done]="isCompleted(p)" [class.pend]="isPending(p)">{{ p.status }}</span>
                <p class="muted">Ride {{ shortId(p.rideId) }} · {{ p.createdAt | date:'short' }}</p>
              </div>
              <strong>Rs. {{ p.amount ?? '—' }}</strong>
            </div>
          } @empty {
            <p class="muted">You have not paid for any ride yet.</p>
          }
        </section>
      }
    </div>
  `,
  styles: [`
    .head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
    .subhead { margin: 1.25rem 0 0.5rem; }
    .chips { display: flex; gap: 0.35rem; flex-wrap: wrap; margin-bottom: 0.35rem; }
    .chip {
      font-size: 0.72rem; font-weight: 800; padding: 0.25rem 0.65rem; border-radius: 999px;
      background: #e8f8f1; color: #0b7f58;
    }
    .chip.gold { background: #fff7cc; color: #a16207; }
    h1 { margin: 0; font-size: 1.35rem; font-weight: 800; }
    h2 { margin: 0 0 0.75rem; font-size: 1.05rem; font-weight: 800; }
    .sub { margin: 0.25rem 0 0; color: #64748b; font-size: 0.9rem; }
    .card {
      background: #fff; border: 1px solid #b7ebc9; border-radius: 16px;
      padding: 1.15rem; margin-bottom: 0.9rem;
      box-shadow: 0 6px 18px rgba(15,23,42,0.04); max-width: 560px;
    }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
    .stat { text-align: center; }
    .stat strong { display: block; font-size: 1.15rem; margin-top: 0.25rem; }
    .lbl { display: block; font-size: 0.8rem; font-weight: 700; color: #64748b; margin-bottom: 0.55rem; }
    .inp {
      display: block; width: 100%; margin-top: 0.3rem; min-height: 44px;
      padding: 0.5rem 0.75rem; border-radius: 12px; border: 1px solid #e2e8f0; font-size: 0.95rem;
    }
    .btn {
      display: inline-flex; align-items: center; justify-content: center; min-height: 44px;
      padding: 0.5rem 1.1rem; border-radius: 999px; font-weight: 800; font-size: 0.85rem;
      border: none; cursor: pointer; margin-top: 0.5rem; margin-right: 0.4rem; text-decoration: none;
    }
    .btn.sm { min-height: 36px; padding: 0.35rem 0.85rem; font-size: 0.78rem; margin-top: 0; }
    .btn.primary { background: #0d9f6e; color: #fff; }
    .btn.ghost { background: #fff; border: 1px solid #e2e8f0; color: #0f172a; }
    .btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .row-head { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
    .row {
      display: flex; justify-content: space-between; gap: 0.75rem; padding: 0.65rem 0;
      border-bottom: 1px solid #f1f5f9; align-items: flex-start;
    }
    .badge {
      display: inline-block; margin-left: 0.4rem; font-size: 0.68rem; font-weight: 800;
      padding: 0.15rem 0.5rem; border-radius: 999px; background: #f1f5f9; color: #64748b;
      vertical-align: middle;
    }
    .badge.done { background: #dcfce7; color: #15803d; }
    .badge.pend { background: #fef9c3; color: #a16207; }
    .fare-box {
      display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.5rem 1rem;
      margin-top: 0.75rem; padding: 0.75rem 1rem; border-radius: 12px;
      background: #f0fdf4; border: 1px solid #a7f3d0;
    }
    .fare-box strong { font-size: 1.2rem; color: #0d9f6e; }
    .otp-box {
      margin-top: 0.75rem; padding: 0.85rem; border-radius: 12px;
      background: #f0fdf4; border: 1px solid #a7f3d0;
    }
    .muted { color: #64748b; font-size: 0.88rem; }
    .err { color: #e11d48; } .ok { color: #0d9f6e; } .warn { color: #ca8a04; }
    .hint { max-width: 560px; color: #64748b; font-size: 0.88rem; margin: 0.5rem 0 1rem; }
  `]
})
export class PaymentPageComponent implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private api = (environment.apiUrl || '/api/v1').replace(/\/$/, '');

  selectedRideId = '';
  method = 'Cash';
  mobileAccount = '';
  mobileMasked = '';
  otp = '';
  pendingPaymentId = '';

  rides = signal<any[]>([]);
  payments = signal<any[]>([]);
  fare = signal<any | null>(null);

  loadingRides = signal(false);
  busy = signal(false);
  err = signal('');
  msg = signal('');
  loadErr = signal('');
  showOtp = signal(false);

  private myUserId = '';

  private payableStatuses = new Set([
    'completed', 'inprogress', 'driverarrived', 'confirmed',
    'Completed', 'InProgress', 'DriverArrived', 'Confirmed'
  ]);

  receivedPayments = computed(() => {
    const uid = this.myUserId.toLowerCase();
    return this.payments().filter((p) => {
      const payee = String(p.payeeUserId || p.payeeId || '').toLowerCase();
      return payee && uid && payee === uid;
    });
  });

  paidByMe = computed(() => {
    const uid = this.myUserId.toLowerCase();
    return this.payments().filter((p) => {
      const payer = String(p.payerUserId || p.payerId || '').toLowerCase();
      return payer && uid && payer === uid;
    });
  });

  driverTotals = computed(() => {
    let completed = 0;
    let pending = 0;
    for (const p of this.receivedPayments()) {
      const amt = Number(p.amount) || 0;
      if (this.isCompleted(p)) completed += amt;
      else if (this.isPending(p)) pending += amt;
    }
    return { completed, pending };
  });

  ngOnInit(): void {
    this.myUserId = this.resolveUserId();
    this.reloadPayments();
    if (!this.isDriverView() || this.isAlsoPassenger()) {
      this.loadRides();
    }
  }

  isDriver(): boolean {
    return this.hasRole('Driver') || this.hasRole('Admin');
  }

  isPassengerOnly(): boolean {
    return this.hasRole('Passenger') && !this.hasRole('Driver') && !this.hasRole('Admin');
  }

  isAlsoPassenger(): boolean {
    return this.hasRole('Passenger') && this.hasRole('Driver');
  }

  /** Primary screen: driver earnings if user is driver (and not passenger-only). */
  isDriverView(): boolean {
    return this.isDriver() && !this.isPassengerOnly();
  }

  private hasRole(role: string): boolean {
    const a: any = this.auth;
    const roles: string[] =
      a.roles?.() ??
      a.currentUser?.()?.roles ??
      a.user?.()?.roles ??
      a.getRoles?.() ??
      [];
    if (Array.isArray(roles) && roles.some((r) => String(r).toLowerCase() === role.toLowerCase())) {
      return true;
    }
    // JWT-style single role string
    const one = a.role?.() ?? a.currentUser?.()?.role ?? '';
    return String(one).toLowerCase() === role.toLowerCase();
  }

  private resolveUserId(): string {
    const a: any = this.auth;
    const u = a.currentUser?.() ?? a.user?.() ?? a.getUser?.() ?? {};
    return String(u.id || u.userId || a.userId?.() || '');
  }

  isCompleted(p: any): boolean {
    return String(p.status || '').toLowerCase() === 'completed';
  }

  isPending(p: any): boolean {
    const s = String(p.status || '').toLowerCase();
    return s === 'pending' || s === 'processing';
  }

  needsMobile(): boolean {
    return this.method === 'JazzCash' || this.method === 'EasyPaisa';
  }

  payButtonLabel(): string {
    if (this.method === 'Cash') return 'Confirm cash paid to driver';
    if (this.needsMobile()) return 'Send OTP & pay';
    return 'Pay now';
  }

  shortId(id: string | undefined): string {
    if (!id) return '';
    return id.length > 8 ? id.slice(0, 8) + '…' : id;
  }

  rideLabel(r: any): string {
    const st = r.status || r.Status || '';
    const from = r.sourceAddress || r.route?.sourceAddress || '';
    const to = r.destinationAddress || r.route?.destinationAddress || '';
    const path = from && to ? `${this.clip(from)} → ${this.clip(to)}` : this.shortId(r.id);
    return `${st} · ${path}`;
  }

  private clip(s: string): string {
    return s.length > 28 ? s.slice(0, 26) + '…' : s;
  }

  onMethodChange(): void {
    this.showOtp.set(false);
    this.otp = '';
    this.pendingPaymentId = '';
    this.err.set('');
    this.msg.set('');
  }

  onRideChange(): void {
    this.fare.set(null);
    this.err.set('');
    this.msg.set('');
    this.showOtp.set(false);
    if (!this.selectedRideId) return;
    this.http.get<any>(`${this.api}/payments/fare/${this.selectedRideId}`).subscribe({
      next: (r) => this.fare.set(r?.data ?? r),
      error: () => this.fare.set(null)
    });
  }

  cancelOtp(): void {
    this.showOtp.set(false);
    this.otp = '';
    this.pendingPaymentId = '';
  }

  loadRides(): void {
    this.loadingRides.set(true);
    this.loadErr.set('');
    this.http.get<any>(`${this.api}/rides/my`).subscribe({
      next: (r) => {
        this.loadingRides.set(false);
        const d = r?.data ?? r;
        const list = Array.isArray(d) ? d : d?.items ?? d?.rides ?? [];
        const payable = list.filter((x: any) => {
          const st = String(x.status || x.Status || '');
          return this.payableStatuses.has(st) || this.payableStatuses.has(st.replace(/\s/g, ''));
        });
        this.rides.set(payable.length ? payable : list);
      },
      error: () => {
        this.loadingRides.set(false);
        this.loadErr.set('Could not load rides.');
      }
    });
  }

  reloadPayments(): void {
    this.busy.set(true);
    this.http.get<any>(`${this.api}/payments/my`).subscribe({
      next: (r) => {
        this.busy.set(false);
        const d = r?.data ?? r;
        this.payments.set(Array.isArray(d) ? d : d?.items ?? []);
        // refresh user id if auth loaded late
        if (!this.myUserId) this.myUserId = this.resolveUserId();
      },
      error: () => {
        this.busy.set(false);
      }
    });
  }

  pay(): void {
    this.busy.set(true);
    this.err.set('');
    this.msg.set('');

    if (!this.selectedRideId) {
      this.busy.set(false);
      this.err.set('Select a ride first.');
      return;
    }

    if (this.needsMobile() && (!this.mobileAccount || this.mobileAccount.trim().length < 11)) {
      this.busy.set(false);
      this.err.set('Enter a valid mobile number (03XXXXXXXXX).');
      return;
    }

    const body: any = {
      rideId: this.selectedRideId,
      method: this.method
    };
    if (this.needsMobile()) body.mobileAccount = this.mobileAccount.trim();

    this.http.post<any>(`${this.api}/payments`, body).subscribe({
      next: (r) => {
        this.busy.set(false);
        const d = r?.data ?? r;
        this.msg.set(r?.message || d?.message || 'Payment recorded');

        if (d?.requiresConfirmation) {
          this.pendingPaymentId = d.id;
          this.mobileMasked = d.mobileAccountMasked || '';
          this.showOtp.set(true);
        } else {
          this.msg.set(
            this.method === 'Cash'
              ? 'Cash payment completed — driver marked as paid. Driver can see this under Earnings.'
              : (r?.message || 'Payment completed.')
          );
        }
        this.reloadPayments();
      },
      error: (e) => {
        this.busy.set(false);
        this.err.set(e.error?.message || 'Payment failed');
      }
    });
  }

  confirmOtp(): void {
    if (!this.pendingPaymentId) return;
    this.busy.set(true);
    this.err.set('');
    this.http
      .post<any>(`${this.api}/payments/${this.pendingPaymentId}/confirm-otp`, {
        confirmationCode: this.otp.trim()
      })
      .subscribe({
        next: (r) => {
          this.busy.set(false);
          this.msg.set(r?.message || 'Payment completed — driver paid.');
          this.showOtp.set(false);
          this.otp = '';
          this.pendingPaymentId = '';
          this.reloadPayments();
        },
        error: (e) => {
          this.busy.set(false);
          this.err.set(e.error?.message || 'OTP verification failed');
        }
      });
  }
}
