import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="rs-page">
      <header class="head">
        <div>
          <div class="chips"><span class="chip">Settings</span></div>
          <h1>Settings</h1>
          <p class="sub">Shortcuts to account, safety and verification.</p>
        </div>
      </header>

      <div class="grid">
        <a class="card" routerLink="/app/profile">
          <strong>Profile</strong>
          <span>Name, phone, gender</span>
        </a>
        <a class="card" routerLink="/app/driver-profile">
          <strong>Driver profile</strong>
          <span>Availability &amp; license</span>
        </a>
        <a class="card" routerLink="/app/safety">
          <strong>Safety &amp; SOS</strong>
          <span>Emergency contacts</span>
        </a>
        <a class="card" routerLink="/app/verification">
          <strong>Verification</strong>
          <span>Institution documents</span>
        </a>
        <a class="card" routerLink="/app/wallet">
          <strong>Wallet</strong>
          <span>Balance &amp; deposits</span>
        </a>
        <a class="card" routerLink="/app/notifications">
          <strong>Notifications</strong>
          <span>Alerts inbox</span>
        </a>
      </div>

      <button type="button" class="btn danger" (click)="logout()">Logout</button>
    </div>
  `,
  styles: [`
    .head { margin-bottom: 1rem; }
    .chip {
      font-size: 0.72rem; font-weight: 800; padding: 0.25rem 0.65rem; border-radius: 999px;
      background: #e8f8f1; color: #0b7f58;
    }
    h1 { margin: 0.35rem 0 0; font-size: 1.4rem; font-weight: 800; }
    .sub { margin: 0.3rem 0 0; color: #64748b; font-size: 0.9rem; }
    .grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1.25rem;
    }
    @media (max-width: 800px) { .grid { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 500px) { .grid { grid-template-columns: 1fr; } }
    .card {
      background: #fff; border: 1px solid #b7ebc9; border-radius: 14px; padding: 1rem;
      text-decoration: none; color: inherit; display: flex; flex-direction: column; gap: 0.25rem;
    }
    .card:hover { border-color: #0d9f6e; }
    .card strong { font-size: 0.95rem; }
    .card span { color: #64748b; font-size: 0.82rem; }
    .btn.danger {
      min-height: 44px; padding: 0.5rem 1.2rem; border-radius: 999px; border: none;
      background: #e11d48; color: #fff; font-weight: 800; cursor: pointer;
    }
  `]
})
export class SettingsComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  logout(): void {
    (this.auth as any).logout?.();
    localStorage.removeItem('access_token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    this.router.navigateByUrl('/auth');
  }
}
