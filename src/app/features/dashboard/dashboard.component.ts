import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="shell">
      <!-- Ambient orbs -->
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>

      <nav class="nav animate-in">
        <div class="brand">
          <div class="logo">
            <span class="logo-inner">RS</span>
          </div>
          <div class="brand-text">
            <strong>RideSharing</strong>
            <small>Daily commute matching</small>
          </div>
        </div>

        <div class="nav-links">
          @if (auth.isAuthenticated()) {
            <span class="hello">Hi, <b>{{ auth.currentUser()?.firstName }}</b></span>
            <span class="role-pill">{{ auth.currentUser()?.roles?.[0] || 'User' }}</span>
            <a routerLink="/app/profile" class="nav-btn">Profile</a>
            <a routerLink="/app/routes" class="nav-btn">Routes</a>
            <a routerLink="/app/rides" class="nav-btn">Requests</a>
            <a routerLink="/app/rides/lifecycle" class="nav-btn accent">My Rides</a>
            @if (auth.hasRole('Driver') || auth.hasRole('Admin')) {
              <a routerLink="/app/vehicles" class="nav-btn">Vehicles</a>
              <a routerLink="/app/driver-profile" class="nav-btn">Driver</a>
            }
            <button class="nav-btn ghost" (click)="auth.logout()">Logout</button>
          } @else {
            <a routerLink="/auth" class="nav-btn">Login</a>
            <a routerLink="/auth/register" class="nav-btn primary">Get Started</a>
          }
        </div>
      </nav>

      <main class="hero">
        <div class="hero-badge animate-in animate-in-delay-1">
          <span class="dot"></span> Built for Pakistan’s daily commuters
        </div>
        <h1 class="animate-in animate-in-delay-2">
          Share the road.<br />
          <span class="gradient-text">Match the route.</span>
        </h1>
        <p class="sub animate-in animate-in-delay-3">
          Connect with verified travellers on the same path, same time —
          safer, cheaper, and designed for repeat daily journeys.
        </p>

        @if (!auth.isAuthenticated()) {
          <div class="cta animate-in animate-in-delay-4">
            <a routerLink="/auth/register" class="btn primary lg">Create free account</a>
            <a routerLink="/auth" class="btn glass lg">I already have an account</a>
          </div>
        } @else {
          <div class="welcome glass animate-in animate-in-delay-4">
            <div class="welcome-top">
              <div>
                <h3>Welcome back, {{ auth.currentUser()?.firstName }}</h3>
                <p>{{ auth.currentUser()?.email }}</p>
              </div>
              <div class="status-chip online">Online</div>
            </div>
            <div class="quick">
              <a routerLink="/app/rides/find" class="quick-card">
                <span class="qi">🔍</span>
                <span>Find a ride</span>
              </a>
              <a routerLink="/app/rides/lifecycle" class="quick-card">
                <span class="qi">🚗</span>
                <span>My rides</span>
              </a>
              <a routerLink="/app/routes" class="quick-card">
                <span class="qi">🗺️</span>
                <span>My routes</span>
              </a>
              <a routerLink="/app/profile" class="quick-card">
                <span class="qi">👤</span>
                <span>Profile</span>
              </a>
            </div>
          </div>
        }

        <div class="features">
          <div class="feature glass animate-in animate-in-delay-1">
            <div class="fi">🛣️</div>
            <h4>Smart route match</h4>
            <p>Score by proximity, time window & preferences — not random.</p>
          </div>
          <div class="feature glass animate-in animate-in-delay-2">
            <div class="fi">🔒</div>
            <h4>Trust first</h4>
            <p>Verified profiles, roles, and women-only options when needed.</p>
          </div>
          <div class="feature glass animate-in animate-in-delay-3">
            <div class="fi">⚡</div>
            <h4>Live ride flow</h4>
            <p>Confirm → arriving → in progress → complete, with clear status.</p>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .shell { min-height: 100vh; position: relative; overflow: hidden; font-family: var(--font); }
    .orb { position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none; z-index: 0; }
    .orb-1 { width: 420px; height: 420px; background: rgba(91,140,255,.2); top: -120px; left: -80px; animation: float 9s ease-in-out infinite; }
    .orb-2 { width: 320px; height: 320px; background: rgba(124,92,255,.15); top: 20%; right: -60px; animation: float 11s ease-in-out infinite reverse; }
    .orb-3 { width: 280px; height: 280px; background: rgba(34,211,238,.08); bottom: 5%; left: 30%; animation: float 13s ease-in-out infinite; }

    .nav {
      position: relative; z-index: 10;
      display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;
      padding: 1rem 1.5rem; margin: 1rem; border-radius: 1.25rem;
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
      backdrop-filter: blur(16px);
    }
    .brand { display: flex; align-items: center; gap: 0.75rem; }
    .logo {
      width: 44px; height: 44px; border-radius: 14px;
      background: linear-gradient(135deg, #5b8cff, #7c5cff);
      display: grid; place-items: center; box-shadow: 0 8px 24px var(--primary-glow);
    }
    .logo-inner { font-weight: 800; font-size: 0.95rem; letter-spacing: 0.02em; }
    .brand-text { display: flex; flex-direction: column; line-height: 1.15; }
    .brand-text strong { font-size: 1.05rem; }
    .brand-text small { color: var(--text-muted); font-size: 0.72rem; font-weight: 400; }

    .nav-links { display: flex; align-items: center; flex-wrap: wrap; gap: 0.45rem; }
    .hello { color: var(--text-muted); font-size: 0.88rem; margin-right: 0.25rem; }
    .hello b { color: #fff; font-weight: 600; }
    .role-pill {
      padding: 0.2rem 0.65rem; border-radius: 999px; font-size: 0.72rem; font-weight: 600;
      background: rgba(91,140,255,0.2); border: 1px solid rgba(91,140,255,0.35); color: #bfdbfe;
    }
    .nav-btn {
      padding: 0.45rem 0.85rem; border-radius: 999px; font-size: 0.82rem; font-weight: 500;
      border: 1px solid transparent; color: #e2e8f0; transition: all 0.2s ease; cursor: pointer;
      background: transparent;
    }
    .nav-btn:hover { background: rgba(255,255,255,0.08); }
    .nav-btn.primary {
      background: linear-gradient(135deg, #5b8cff, #7c5cff); color: #fff;
      box-shadow: 0 6px 20px var(--primary-glow);
    }
    .nav-btn.accent {
      background: rgba(34,211,238,0.12); border-color: rgba(34,211,238,0.35); color: #a5f3fc;
    }
    .nav-btn.ghost { border-color: rgba(255,255,255,0.15); }

    .hero {
      position: relative; z-index: 5;
      max-width: 980px; margin: 0 auto; padding: 2.5rem 1.5rem 4rem; text-align: center;
    }
    .hero-badge {
      display: inline-flex; align-items: center; gap: 0.5rem;
      padding: 0.4rem 0.9rem; border-radius: 999px; font-size: 0.8rem;
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
      color: var(--text-muted); margin-bottom: 1.5rem;
    }
    .dot {
      width: 8px; height: 8px; border-radius: 50%; background: var(--success);
      box-shadow: 0 0 0 0 rgba(52,211,153,0.5); animation: pulse-glow 2s infinite;
    }
    h1 {
      font-size: clamp(2.4rem, 6vw, 4rem); font-weight: 800; line-height: 1.08;
      letter-spacing: -0.03em; margin-bottom: 1rem;
    }
    .gradient-text {
      background: linear-gradient(135deg, #5b8cff 0%, #a78bfa 50%, #22d3ee 100%);
      -webkit-background-clip: text; background-clip: text; color: transparent;
    }
    .sub {
      max-width: 540px; margin: 0 auto 2rem; color: var(--text-muted);
      font-size: 1.08rem; line-height: 1.6;
    }
    .cta { display: flex; gap: 0.85rem; justify-content: center; flex-wrap: wrap; margin-bottom: 2.5rem; }
    .btn {
      display: inline-flex; align-items: center; justify-content: center;
      padding: 0.75rem 1.4rem; border-radius: 999px; font-weight: 600; font-size: 0.95rem;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn.lg { padding: 0.95rem 1.75rem; }
    .btn.primary {
      background: linear-gradient(135deg, #5b8cff, #7c5cff); color: #fff;
      box-shadow: 0 12px 30px var(--primary-glow);
    }
    .btn.primary:hover { transform: translateY(-2px); box-shadow: 0 16px 36px var(--primary-glow); }
    .btn.glass {
      background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.14); color: #fff;
    }
    .btn.glass:hover { background: rgba(255,255,255,0.1); }

    .welcome {
      text-align: left; padding: 1.35rem; margin: 0 auto 2.5rem; max-width: 640px;
    }
    .welcome-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1.1rem; }
    .welcome h3 { font-size: 1.15rem; margin-bottom: 0.2rem; }
    .welcome p { color: var(--text-muted); font-size: 0.88rem; }
    .status-chip {
      padding: 0.25rem 0.65rem; border-radius: 999px; font-size: 0.72rem; font-weight: 600;
    }
    .status-chip.online { background: rgba(52,211,153,0.15); color: #6ee7b7; border: 1px solid rgba(52,211,153,0.3); }
    .quick { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.65rem; }
    @media (max-width: 600px) { .quick { grid-template-columns: repeat(2, 1fr); } }
    .quick-card {
      display: flex; flex-direction: column; align-items: center; gap: 0.4rem;
      padding: 1rem 0.5rem; border-radius: 1rem;
      background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
      transition: all 0.25s ease; font-size: 0.82rem; font-weight: 500;
    }
    .quick-card:hover {
      background: rgba(91,140,255,0.12); border-color: rgba(91,140,255,0.3);
      transform: translateY(-3px);
    }
    .qi { font-size: 1.4rem; }

    .features {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; text-align: left;
    }
    @media (max-width: 768px) { .features { grid-template-columns: 1fr; } }
    .feature { padding: 1.35rem; transition: transform 0.25s ease, border-color 0.25s; }
    .feature:hover { transform: translateY(-4px); border-color: rgba(91,140,255,0.3); }
    .fi { font-size: 1.75rem; margin-bottom: 0.65rem; }
    .feature h4 { font-size: 1.05rem; margin-bottom: 0.4rem; font-family: var(--font); }
    .feature p { color: var(--text-muted); font-size: 0.88rem; line-height: 1.5; }
  `]
})
export class DashboardComponent {
  auth = inject(AuthService);
}
