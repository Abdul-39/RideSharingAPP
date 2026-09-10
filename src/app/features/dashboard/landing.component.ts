import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="shell">
      <div class="orb o1"></div><div class="orb o2"></div>
      <nav class="nav">
        <div class="brand"><span class="logo">RS</span><strong>RideSharing</strong></div>
        <div class="links">
          @if (auth.isAuthenticated()) {
            <a routerLink="/app/dashboard" class="btn">Open dashboard</a>
            <button type="button" class="btn ghost" (click)="auth.logout()">Logout</button>
          } @else {
            <a routerLink="/auth" class="btn ghost">Login</a>
            <a routerLink="/auth/register" class="btn">Get started</a>
          }
        </div>
      </nav>
      <main>
        <h1>Smart ride sharing for<br /><span>daily commuters</span></h1>
        <p>Match verified travellers on the same route and schedule — built for Pakistan’s repeat-route journeys.</p>
        <div class="cta">
          @if (auth.isAuthenticated()) {
            <a routerLink="/app/dashboard" class="btn lg">Go to dashboard</a>
          } @else {
            <a routerLink="/auth/register" class="btn lg">Create free account</a>
            <a routerLink="/auth" class="btn ghost lg">I have an account</a>
          }
        </div>
        <div class="features">
          <div class="f"><h3>Route matching</h3><p>Ranked by proximity, time window, and preferences.</p></div>
          <div class="f"><h3>Live lifecycle</h3><p>Confirm, arrive, start, and complete with clear status.</p></div>
          <div class="f"><h3>Trust layer</h3><p>Roles, verification, and driver availability controls.</p></div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .shell { min-height: 100vh; position: relative; overflow: hidden; background: #060b18; color: #f1f5f9; }
    .orb { position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none; }
    .o1 { width: 400px; height: 400px; background: rgba(91,140,255,.18); top: -100px; left: -80px; }
    .o2 { width: 300px; height: 300px; background: rgba(124,92,255,.12); top: 20%; right: -60px; }
    .nav { position: relative; z-index: 2; display: flex; justify-content: space-between; align-items: center;
      padding: 1rem 1.25rem; margin: 0.75rem; border-radius: 1rem;
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); }
    .brand { display: flex; align-items: center; gap: 0.55rem; }
    .logo { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; font-weight: 800;
      background: linear-gradient(135deg,#5b8cff,#7c5cff); font-size: 0.8rem; }
    .links { display: flex; gap: 0.5rem; }
    main { position: relative; z-index: 2; max-width: 880px; margin: 0 auto; padding: 3rem 1.25rem 4rem; text-align: center; }
    h1 { font-size: clamp(2rem, 5vw, 3.2rem); line-height: 1.1; letter-spacing: -0.03em; margin: 0 0 1rem; }
    h1 span { background: linear-gradient(135deg,#5b8cff,#a78bfa,#22d3ee); -webkit-background-clip: text; background-clip: text; color: transparent; }
    main > p { color: #94a3b8; max-width: 520px; margin: 0 auto 1.75rem; line-height: 1.6; }
    .cta { display: flex; gap: 0.65rem; justify-content: center; flex-wrap: wrap; margin-bottom: 2.5rem; }
    .btn { display: inline-flex; padding: 0.55rem 1.1rem; border-radius: 999px; font-weight: 600; font-size: 0.9rem;
      background: linear-gradient(135deg,#5b8cff,#7c5cff); color: #fff; text-decoration: none; border: none; cursor: pointer; }
    .btn.ghost { background: transparent; border: 1px solid rgba(255,255,255,0.15); color: #e2e8f0; }
    .btn.lg { padding: 0.85rem 1.4rem; }
    .features { display: grid; grid-template-columns: repeat(3,1fr); gap: 0.85rem; text-align: left; }
    @media (max-width: 700px) { .features { grid-template-columns: 1fr; } }
    .f { padding: 1.1rem; border-radius: 1rem; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); }
    .f h3 { margin: 0 0 0.35rem; font-size: 1rem; }
    .f p { margin: 0; color: #94a3b8; font-size: 0.88rem; line-height: 1.45; }
  `]
})
export class LandingComponent implements OnInit {
  auth = inject(AuthService);
  private router = inject(Router);
  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.router.navigateByUrl('/app/dashboard');
    }
  }
}
