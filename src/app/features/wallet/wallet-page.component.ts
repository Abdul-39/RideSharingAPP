import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PaymentApiService, WalletDto, WalletTransactionDto } from '../../core/services/payment.service';

@Component({
  selector: 'app-wallet-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page">
      <header>
        <h1>Mock Wallet</h1>
        <p>Demo balance only — no real money or card data</p>
      </header>

      <section class="card balance">
        @if (wallet(); as w) {
          <div class="amt">{{ w.balance | number:'1.2-2' }} <small>{{ w.currency }}</small></div>
          <p class="muted">Your mock wallet balance</p>
        } @else {
          <p class="muted">Loading…</p>
        }
        <div class="deposit">
          <input type="number" [(ngModel)]="depositAmount" min="1" max="100000" step="50" />
          <button type="button" class="btn" (click)="deposit()" [disabled]="busy()">Deposit</button>
        </div>
        @if (msg()) { <p class="ok">{{ msg() }}</p> }
        @if (err()) { <p class="err">{{ err() }}</p> }
      </section>

      <section class="card">
        <div class="row-head">
          <h2>Transactions</h2>
          <a routerLink="/app/payments" class="link">Payments →</a>
        </div>
        @for (t of txs(); track t.id) {
          <div class="tx">
            <div>
              <strong>{{ t.type }}</strong>
              <span>{{ t.description }}</span>
              <small>{{ t.createdAt | date:'medium' }}</small>
            </div>
            <div class="tx-amt" [class.neg]="t.amount < 0">{{ t.amount | number:'1.2-2' }}</div>
          </div>
        } @empty {
          <p class="muted">No transactions yet. Deposit to get started.</p>
        }
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
    .balance .amt { font-size: 2rem; font-weight: 700; }
    .balance small { font-size: 0.9rem; color: #94a3b8; }
    .deposit { display: flex; gap: 0.5rem; margin-top: 0.85rem; }
    input { flex: 1; padding: 0.55rem 0.7rem; border-radius: 0.65rem; border: 1px solid rgba(255,255,255,0.12);
      background: rgba(0,0,0,0.3); color: #fff; }
    .btn { padding: 0.55rem 1rem; border: none; border-radius: 999px; font-weight: 600; cursor: pointer;
      background: linear-gradient(135deg,#5b8cff,#7c5cff); color: #fff; }
    .btn:disabled { opacity: 0.5; }
    .ok { color: #6ee7b7; } .err { color: #fca5a5; }
    .row-head { display: flex; justify-content: space-between; align-items: center; }
    h2 { margin: 0 0 0.75rem; font-size: 1rem; }
    .link { color: #93c5fd; text-decoration: none; font-size: 0.85rem; }
    .tx { display: flex; justify-content: space-between; gap: 0.75rem; padding: 0.65rem 0;
      border-bottom: 1px solid rgba(255,255,255,0.06); }
    .tx strong { display: block; font-size: 0.9rem; }
    .tx span { display: block; font-size: 0.8rem; color: #94a3b8; }
    .tx small { color: #64748b; font-size: 0.72rem; }
    .tx-amt { font-weight: 700; color: #6ee7b7; }
    .tx-amt.neg { color: #fca5a5; }
  `]
})
export class WalletPageComponent implements OnInit {
  private api = inject(PaymentApiService);
  wallet = signal<WalletDto | null>(null);
  txs = signal<WalletTransactionDto[]>([]);
  busy = signal(false);
  msg = signal('');
  err = signal('');
  depositAmount = 500;

  ngOnInit(): void { this.reload(); }

  reload(): void {
    this.api.getWallet().subscribe({ next: r => { if (r.success && r.data) this.wallet.set(r.data); } });
    this.api.transactions().subscribe({ next: r => { if (r.success && r.data) this.txs.set(r.data); } });
  }

  deposit(): void {
    this.busy.set(true); this.msg.set(''); this.err.set('');
    this.api.deposit(Number(this.depositAmount)).subscribe({
      next: r => {
        this.busy.set(false);
        if (r.success && r.data) { this.wallet.set(r.data); this.msg.set(r.message || 'Deposited'); this.reload(); }
        else this.err.set(r.message);
      },
      error: e => { this.busy.set(false); this.err.set(e.error?.message || 'Deposit failed'); }
    });
  }
}
