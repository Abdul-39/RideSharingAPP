import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PaymentApiService, FareBreakdownDto, PaymentDto } from '../../core/services/payment.service';
import { RideService } from '../../core/services/ride.service';

@Component({
  selector: 'app-payment-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page">
      <header>
        <h1>Payments</h1>
        <p>Cash or Mock Wallet — no real gateways yet</p>
      </header>

      <section class="card">
        <h2>Pay for a ride</h2>
        <label>Ride ID
          <input [(ngModel)]="rideId" name="rideId" placeholder="Paste ride GUID or open from My Rides" />
        </label>
        <div class="actions">
          <button type="button" class="btn ghost" (click)="estimate()" [disabled]="!rideId || busy()">Estimate fare</button>
        </div>
        @if (fare(); as f) {
          <div class="fare">
            <div>Base: <strong>{{ f.baseFare | number:'1.2-2' }}</strong> {{ f.currency }}</div>
            <div>Distance: <strong>{{ f.distanceKm | number:'1.2-2' }} km</strong> → {{ f.distanceFare | number:'1.2-2' }}</div>
            <div>Passengers: <strong>{{ f.participantCount }}</strong></div>
            <div class="total">Your share: <strong>{{ f.sharedFarePerPassenger | number:'1.2-2' }} {{ f.currency }}</strong></div>
            <div class="muted">Total trip fare: {{ f.totalFare | number:'1.2-2' }}</div>
          </div>
          <div class="methods">
            <label><input type="radio" name="m" [(ngModel)]="method" value="Cash" /> Cash</label>
            <label><input type="radio" name="m" [(ngModel)]="method" value="MockWallet" /> Mock Wallet</label>
          </div>
          <button type="button" class="btn" (click)="pay()" [disabled]="busy()">Pay</button>
        }
        @if (msg()) { <p class="ok">{{ msg() }}</p> }
        @if (err()) { <p class="err">{{ err() }}</p> }
      </section>

      @if (lastPayment(); as p) {
        <section class="card">
          <h2>Last payment</h2>
          <p><strong>{{ p.status }}</strong> · {{ p.method }} · {{ p.amount | number:'1.2-2' }} {{ p.currency }}</p>
          @if (p.method === 'Cash' && p.status === 'Pending') {
            <button type="button" class="btn" (click)="confirmCash(p.id)">Confirm cash received</button>
          }
          @if (p.failureReason) { <p class="err">{{ p.failureReason }}</p> }
        </section>
      }

      <section class="card">
        <h2>My payment history</h2>
        @for (p of history(); track p.id) {
          <div class="row">
            <div>
              <strong>{{ p.status }}</strong> · {{ p.method }}
              <span class="muted">{{ p.createdAt | date:'medium' }}</span>
            </div>
            <div>{{ p.amount | number:'1.2-2' }} {{ p.currency }}</div>
          </div>
        } @empty {
          <p class="muted">No payments yet.</p>
        }
        <a routerLink="/app/wallet" class="link">Open wallet →</a>
      </section>
    </div>
  `,
  styles: [`
    .page { max-width: 640px; margin: 0 auto; }
    header { margin-bottom: 1rem; }
    h1 { margin: 0; font-size: 1.45rem; }
    header p, .muted { color: #94a3b8; font-size: 0.88rem; }
    .card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
      border-radius: 1.1rem; padding: 1.15rem; margin-bottom: 1rem; }
    h2 { margin: 0 0 0.75rem; font-size: 1rem; }
    label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.8rem; color: #94a3b8; }
    input[type=text], input:not([type=radio]) {
      padding: 0.55rem 0.7rem; border-radius: 0.65rem; border: 1px solid rgba(255,255,255,0.12);
      background: rgba(0,0,0,0.3); color: #fff; }
    .actions { margin: 0.75rem 0; }
    .btn { padding: 0.55rem 1rem; border: none; border-radius: 999px; font-weight: 600; cursor: pointer;
      background: linear-gradient(135deg,#5b8cff,#7c5cff); color: #fff; margin-right: 0.4rem; }
    .btn.ghost { background: transparent; border: 1px solid rgba(255,255,255,0.15); color: #e2e8f0; }
    .btn:disabled { opacity: 0.5; }
    .fare { margin: 0.75rem 0; line-height: 1.6; }
    .total { font-size: 1.05rem; margin-top: 0.35rem; }
    .methods { display: flex; gap: 1rem; margin: 0.75rem 0; }
    .methods label { flex-direction: row; align-items: center; color: #e2e8f0; font-size: 0.9rem; }
    .ok { color: #6ee7b7; } .err { color: #fca5a5; }
    .row { display: flex; justify-content: space-between; padding: 0.55rem 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .link { color: #93c5fd; text-decoration: none; font-size: 0.85rem; display: inline-block; margin-top: 0.75rem; }
  `]
})
export class PaymentPageComponent implements OnInit {
  private api = inject(PaymentApiService);
  private route = inject(ActivatedRoute);
  rideId = '';
  method = 'MockWallet';
  fare = signal<FareBreakdownDto | null>(null);
  lastPayment = signal<PaymentDto | null>(null);
  history = signal<PaymentDto[]>([]);
  busy = signal(false);
  msg = signal('');
  err = signal('');

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap.get('rideId');
    if (q) this.rideId = q;
    this.api.myPayments().subscribe({ next: r => { if (r.success && r.data) this.history.set(r.data); } });
  }

  estimate(): void {
    this.err.set(''); this.msg.set('');
    this.api.estimateFare(this.rideId).subscribe({
      next: r => {
        if (r.success && r.data) this.fare.set(r.data);
        else this.err.set(r.message);
      },
      error: e => this.err.set(e.error?.message || 'Estimate failed')
    });
  }

  pay(): void {
    this.busy.set(true); this.err.set(''); this.msg.set('');
    this.api.createPayment(this.rideId, this.method).subscribe({
      next: r => {
        this.busy.set(false);
        if (r.success && r.data) {
          this.lastPayment.set(r.data);
          this.msg.set(r.message || 'OK');
          this.api.myPayments().subscribe({ next: x => { if (x.success && x.data) this.history.set(x.data); } });
        } else this.err.set(r.message);
      },
      error: e => { this.busy.set(false); this.err.set(e.error?.message || 'Payment failed'); }
    });
  }

  confirmCash(id: string): void {
    this.api.confirmCash(id).subscribe({
      next: r => {
        if (r.success && r.data) { this.lastPayment.set(r.data); this.msg.set(r.message || 'Confirmed'); }
        else this.err.set(r.message);
      },
      error: e => this.err.set(e.error?.message || 'Confirm failed')
    });
  }
}
