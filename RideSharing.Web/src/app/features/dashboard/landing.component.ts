import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

/**
 * Login route in this project is /auth (path: '' under AUTH_ROUTES)
 * Register is /auth/register
 */
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="landing">
      <header class="top">
        <a routerLink="/" class="brand">
          <span class="logo">🚐</span>
          <span>
            <strong>RideShare.pk</strong>
            <small>Daily Repeat Commutes</small>
          </span>
        </a>
        <nav class="nav">
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
          <a href="#safety">Safety</a>
          @if (isLoggedIn()) {
            <a routerLink="/app/dashboard" class="btn primary">Dashboard</a>
          } @else {
            <a routerLink="/auth" class="btn ghost">Sign in</a>
            <a routerLink="/auth/register" class="btn primary">Get started</a>
          }
        </nav>
      </header>

      <section class="hero">
        <div class="hero-copy">
          <div class="chips">
            <span class="chip">Pakistan</span>
            <span class="chip gold">Campus · Office · Factory</span>
          </div>
          <h1>Share your daily route.<br />Save money. Ride safer.</h1>
          <p>
            RideShare.pk matches verified students and employees who travel the
            <strong>same corridor every day</strong> — not random one-off hails. Set home →
            destination once, and the system finds overlapping routes within your time window.
          </p>
          <div class="cta">
            @if (isLoggedIn()) {
              <a routerLink="/app/dashboard" class="btn primary lg">Open dashboard</a>
              <a routerLink="/app/routes" class="btn ghost lg">My routes</a>
            } @else {
              <a routerLink="/auth/register" class="btn primary lg">Create free account</a>
              <a routerLink="/auth" class="btn ghost lg">I already have an account</a>
            }
          </div>
          <ul class="trust">
            <li>✓ Institution verification</li>
            <li>✓ Women-only matching option</li>
            <li>✓ SOS + emergency contacts</li>
            <li>✓ Cash &amp; mock wallet (JazzCash-ready)</li>
          </ul>
        </div>
        <div class="hero-card">
          <div class="mini-card">
            <span class="label">TODAY'S CORRIDOR</span>
            <h3>Alipur Farash → Khanna Pull</h3>
            <p>Mon–Fri · 08:00 · ±15 min</p>
            <div class="pills">
              <span>3 seats left</span>
              <span class="g">Match 92%</span>
            </div>
          </div>
          <div class="mini-card soft">
            <span class="label">LIVE RIDE</span>
            <h3>Driver arriving</h3>
            <p>OTP · Chat · GPS · SOS</p>
            <div class="bar"><i></i></div>
          </div>
        </div>
      </section>

      <section class="section" id="how">
        <h2>How it works</h2>
        <div class="steps">
          <article>
            <span class="n">1</span>
            <h3>Publish your route</h3>
            <p>Home, destination, departure time, and weekdays — once.</p>
          </article>
          <article>
            <span class="n">2</span>
            <h3>Smart matching</h3>
            <p>Route similarity, time window, seats, verification &amp; gender preference.</p>
          </article>
          <article>
            <span class="n">3</span>
            <h3>Ride lifecycle</h3>
            <p>Confirm, OTP, live status, chat, complete, rate — with SOS always available.</p>
          </article>
        </div>
      </section>

      <section class="section alt" id="features">
        <h2>Built for daily Pakistan commutes</h2>
        <div class="feats">
          <div class="feat"><strong>Repeat routes</strong><span>Not one-time Uber-style trips</span></div>
          <div class="feat"><strong>Maps &amp; GPS</strong><span>Leaflet · OpenStreetMap (free)</span></div>
          <div class="feat"><strong>Real-time</strong><span>SignalR status, chat, locations</span></div>
          <div class="feat"><strong>Wallet</strong><span>PKR mock wallet + cash</span></div>
          <div class="feat"><strong>Verification</strong><span>CNIC last-4 · institution ID</span></div>
          <div class="feat"><strong>Admin review</strong><span>Approve driver documents</span></div>
        </div>
      </section>

      <section class="section" id="safety">
        <div class="safety">
          <div>
            <span class="chip red">Safety first</span>
            <h2>Women-only option &amp; SOS guardrails</h2>
            <p>
              Eligible users can prefer women-only matches. During an active ride,
              SOS stores ride ID, time, and location and notifies emergency contacts.
            </p>
          </div>
          <a routerLink="/auth/register" class="btn primary lg">Join RideShare.pk</a>
        </div>
      </section>

      <footer class="foot">
        <div class="brand">
          <span class="logo sm">🚐</span>
          <strong>RideShare.pk</strong>
        </div>
        <p>Final Year Project · ASP.NET Core 8 · Angular 20 · Ionic / Capacitor ready</p>
      </footer>
    </div>
  `,
  styles: [`
    .landing { min-height: 100vh; background: #f3faf6; color: #0f172a; }
    .top {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
      gap: 0.75rem; padding: 0.85rem 1.25rem; background: #fff;
      border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 20;
    }
    .brand { display: flex; align-items: center; gap: 0.55rem; text-decoration: none; color: inherit; }
    .logo {
      width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center;
      background: linear-gradient(135deg, #0d9f6e, #14b8a6); font-size: 1.1rem;
    }
    .logo.sm { width: 32px; height: 32px; font-size: 0.95rem; }
    .brand strong { display: block; color: #0d9f6e; font-size: 1.05rem; }
    .brand small { display: block; color: #64748b; font-size: 0.7rem; }
    .nav { display: flex; flex-wrap: wrap; align-items: center; gap: 0.55rem 0.9rem; }
    .nav > a:not(.btn) { color: #475569; font-weight: 700; font-size: 0.88rem; text-decoration: none; }
    .btn {
      display: inline-flex; align-items: center; justify-content: center;
      min-height: 42px; padding: 0.45rem 1rem; border-radius: 999px;
      font-weight: 800; font-size: 0.88rem; text-decoration: none; border: none; cursor: pointer;
    }
    .btn.primary { background: #0d9f6e; color: #fff; }
    .btn.ghost { background: #fff; border: 1px solid #e2e8f0; color: #0f172a; }
    .btn.lg { min-height: 48px; padding: 0.55rem 1.25rem; }
    .hero {
      max-width: 1120px; margin: 0 auto; padding: 2.5rem 1.25rem 2rem;
      display: grid; grid-template-columns: 1.2fr 0.9fr; gap: 2rem; align-items: center;
    }
    @media (max-width: 900px) { .hero { grid-template-columns: 1fr; } }
    .chips { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.75rem; }
    .chip {
      font-size: 0.72rem; font-weight: 800; padding: 0.28rem 0.7rem; border-radius: 999px;
      background: #e8f8f1; color: #0b7f58;
    }
    .chip.gold { background: #fff7cc; color: #a16207; }
    .chip.red { background: #ffe4e6; color: #be123c; }
    .hero-copy h1 {
      margin: 0; font-size: clamp(1.75rem, 4vw, 2.6rem); font-weight: 800;
      line-height: 1.15; letter-spacing: -0.02em;
    }
    .hero-copy p {
      margin: 1rem 0 1.25rem; color: #475569; font-size: 1.02rem; line-height: 1.55; max-width: 36rem;
    }
    .cta { display: flex; flex-wrap: wrap; gap: 0.55rem; margin-bottom: 1.25rem; }
    .trust {
      list-style: none; padding: 0; margin: 0;
      display: grid; grid-template-columns: 1fr 1fr; gap: 0.35rem 1rem;
      color: #334155; font-size: 0.88rem; font-weight: 600;
    }
    @media (max-width: 500px) { .trust { grid-template-columns: 1fr; } }
    .hero-card { display: flex; flex-direction: column; gap: 0.85rem; }
    .mini-card {
      background: #fff; border: 1px solid #b7ebc9; border-radius: 18px;
      padding: 1.15rem 1.25rem; box-shadow: 0 12px 28px rgba(15,23,42,0.06);
    }
    .mini-card.soft {
      background: linear-gradient(90deg, #fff 0%, #fff8db 100%); border-color: #f5d76e;
    }
    .label { font-size: 0.7rem; font-weight: 800; letter-spacing: 0.05em; color: #64748b; }
    .mini-card h3 { margin: 0.35rem 0 0.2rem; font-size: 1.1rem; }
    .mini-card p { margin: 0; color: #64748b; font-size: 0.88rem; }
    .pills { display: flex; gap: 0.4rem; margin-top: 0.75rem; }
    .pills span {
      font-size: 0.75rem; font-weight: 800; padding: 0.25rem 0.6rem;
      border-radius: 999px; background: #f1f5f9; color: #475569;
    }
    .pills span.g { background: #e8f8f1; color: #0b7f58; }
    .bar { margin-top: 0.85rem; height: 8px; border-radius: 999px; background: #f1f5f9; overflow: hidden; }
    .bar i {
      display: block; width: 55%; height: 100%; border-radius: 999px;
      background: linear-gradient(90deg, #0d9f6e, #f5c518);
    }
    .section { max-width: 1120px; margin: 0 auto; padding: 2rem 1.25rem 2.5rem; }
    .section.alt {
      background: #fff; border-top: 1px solid #e8f5ee; border-bottom: 1px solid #e8f5ee;
      max-width: none; padding-left: 0; padding-right: 0;
    }
    .section.alt > * {
      max-width: 1120px; margin-left: auto; margin-right: auto;
      padding-left: 1.25rem; padding-right: 1.25rem;
    }
    .section h2 { margin: 0 0 1.25rem; font-size: 1.45rem; font-weight: 800; text-align: center; }
    .steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.9rem; }
    @media (max-width: 800px) { .steps { grid-template-columns: 1fr; } }
    .steps article {
      background: #fff; border: 1px solid #b7ebc9; border-radius: 16px; padding: 1.2rem;
    }
    .n {
      display: inline-grid; place-items: center; width: 32px; height: 32px;
      border-radius: 10px; background: #0d9f6e; color: #fff; font-weight: 800; margin-bottom: 0.55rem;
    }
    .steps h3 { margin: 0 0 0.35rem; font-size: 1.05rem; }
    .steps p { margin: 0; color: #64748b; font-size: 0.9rem; line-height: 1.45; }
    .feats {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; padding-bottom: 0.5rem;
    }
    @media (max-width: 800px) { .feats { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 500px) { .feats { grid-template-columns: 1fr; } }
    .feat {
      background: #f3faf6; border: 1px solid #b7ebc9; border-radius: 14px; padding: 1rem;
      display: flex; flex-direction: column; gap: 0.25rem;
    }
    .feat strong { font-size: 0.95rem; }
    .feat span { color: #64748b; font-size: 0.85rem; }
    .safety {
      display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center;
      gap: 1.25rem; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 18px;
      padding: 1.5rem 1.35rem;
    }
    .safety h2 { margin: 0.45rem 0 0.4rem; font-size: 1.25rem; color: #9f1239; }
    .safety p { margin: 0; color: #9f1239; max-width: 36rem; line-height: 1.5; font-size: 0.95rem; }
    .foot {
      text-align: center; padding: 1.75rem 1rem 2.25rem; color: #64748b; font-size: 0.85rem;
      border-top: 1px solid #e8f5ee; background: #fff;
    }
    .foot .brand { justify-content: center; margin-bottom: 0.35rem; }
  `]
})
export class LandingComponent {
  private auth = inject(AuthService);

  isLoggedIn(): boolean {
    const a: any = this.auth;
    if (typeof a.isAuthenticated === 'function') return !!a.isAuthenticated();
    if (typeof a.isLoggedIn === 'function') return !!a.isLoggedIn();
    const t =
      a.accessToken?.() ??
      a.getAccessToken?.() ??
      localStorage.getItem('access_token') ??
      localStorage.getItem('accessToken') ??
      localStorage.getItem('token');
    return !!t;
  }
}
