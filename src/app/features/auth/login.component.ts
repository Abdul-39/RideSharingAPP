import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card">

        <div class="brand">
          <span class="logo">🚐</span>

          <div>
            <strong>RideShare.pk</strong>
            <small>Daily Repeat Commutes</small>
          </div>
        </div>

        <h1>Welcome back</h1>

        <p class="sub">
          Sign in to match campus &amp; office corridors.
        </p>

        @if (err()) {
          <p class="err">{{ err() }}</p>
        }

        <label class="lbl">
          Email

          <input
            class="inp"
            type="email"
            [(ngModel)]="email"
            name="email"
            autocomplete="username"
            placeholder="Enter your email"
          />
        </label>

        <label class="lbl">
          Password

          <input
            class="inp"
            type="password"
            [(ngModel)]="password"
            name="password"
            autocomplete="current-password"
            placeholder="Enter your password"
          />
        </label>

        <button
          type="button"
          class="btn primary full"
          (click)="login()"
          [disabled]="busy()"
        >
          {{ busy() ? 'Signing in…' : 'Sign in' }}
        </button>

        <p class="foot">
          New here?
          <a routerLink="/auth/register">Create account</a>
        </p>

      </div>
    </div>
  `,

  styles: [`
    .auth-page {
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: linear-gradient(
        160deg,
        #e8f8f1 0%,
        #f3faf6 40%,
        #fff 100%
      );
      padding: 1.5rem;
      box-sizing: border-box;
    }

    .auth-card {
      width: 100%;
      max-width: 420px;
      background: #fff;
      border: 1px solid #b7ebc9;
      border-radius: 20px;
      padding: 1.75rem 1.5rem;
      box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
      box-sizing: border-box;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      margin-bottom: 1.25rem;
    }

    .logo {
      width: 44px;
      height: 44px;
      border-radius: 14px;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, #0d9f6e, #14b8a6);
      font-size: 1.2rem;
    }

    .brand strong {
      display: block;
      color: #0d9f6e;
      font-size: 1.1rem;
    }

    .brand small {
      color: #64748b;
      font-size: 0.75rem;
    }

    h1 {
      margin: 0;
      font-size: 1.45rem;
      font-weight: 800;
      color: #0f172a;
    }

    .sub {
      margin: 0.35rem 0 1.1rem;
      color: #64748b;
      font-size: 0.9rem;
    }

    .lbl {
      display: block;
      font-size: 0.78rem;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 0.75rem;
    }

    .inp {
      display: block;
      width: 100%;
      margin-top: 0.3rem;
      min-height: 46px;
      padding: 0.55rem 0.85rem;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      font-size: 0.95rem;
      box-sizing: border-box;
      outline: none;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .inp:focus {
      border-color: #0d9f6e;
      box-shadow: 0 0 0 3px rgba(13, 159, 110, 0.1);
    }

    .inp::placeholder {
      color: #94a3b8;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 48px;
      padding: 0.55rem 1.2rem;
      border-radius: 999px;
      font-weight: 800;
      border: none;
      cursor: pointer;
      transition: opacity 0.2s ease, transform 0.1s ease;
    }

    .btn.primary {
      background: #0d9f6e;
      color: #fff;
    }

    .btn.primary:hover:not(:disabled) {
      opacity: 0.92;
    }

    .btn:active:not(:disabled) {
      transform: scale(0.98);
    }

    .btn:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }

    .full {
      width: 100%;
      margin-top: 0.35rem;
    }

    .foot {
      margin-top: 1.15rem;
      text-align: center;
      color: #64748b;
      font-size: 0.9rem;
    }

    .foot a {
      color: #0d9f6e;
      font-weight: 700;
      text-decoration: none;
    }

    .foot a:hover {
      text-decoration: underline;
    }

    .err {
      color: #e11d48;
      background: #fff1f2;
      border-radius: 10px;
      padding: 0.55rem 0.75rem;
      font-size: 0.88rem;
      margin-bottom: 1rem;
    }

    @media (max-width: 480px) {
      .auth-page {
        padding: 1rem;
      }

      .auth-card {
        padding: 1.5rem 1.2rem;
        border-radius: 18px;
      }
    }
  `]
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';

  busy = signal(false);
  err = signal('');

  login(): void {
    this.err.set('');

    // Validate fields
    if (!this.email.trim() || !this.password) {
      this.err.set('Email and password required');
      return;
    }

    this.busy.set(true);

    // IMPORTANT:
    // AuthService.login() expects ONE LoginRequest object,
    // not email and password as separate arguments.
    const request = {
      email: this.email.trim(),
      password: this.password
    };

    console.log('Login request:', request);

    this.auth.login(request).subscribe({
      next: (res) => {
        console.log('Login response:', res);

        this.busy.set(false);

        if (res.success && res.data) {
          this.router.navigateByUrl('/app/dashboard');
        } else {
          this.err.set(
            res.message || 'Invalid email or password'
          );
        }
      },

      error: (e: any) => {
        console.error('Login error:', e);

        this.busy.set(false);

        this.err.set(
          e.error?.message ||
          e.error?.title ||
          e.message ||
          'Login failed'
        );
      }
    });
  }
}