import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="page">
      <div class="orb o1"></div>
      <div class="orb o2"></div>
      <div class="card glass animate-in">
        <div class="logo">RS</div>
        <h1>Welcome back</h1>
        <p class="sub">Sign in to match rides and manage your commute</p>

        @if (error()) { <div class="toast err">{{ error() }}</div> }

        <form [formGroup]="form" (ngSubmit)="submit()">
          <label>Email</label>
          <input type="email" formControlName="email" placeholder="you@example.com" />
          <label>Password</label>
          <input type="password" formControlName="password" placeholder="••••••••" />
          <button type="submit" class="btn" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>

        <p class="foot">
          New here? <a routerLink="/auth/register">Create an account</a>
        </p>
        <a routerLink="/" class="home">← Back to home</a>
      </div>
    </div>
  `,
  styles: [`
    .page {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      padding: 1.5rem; position: relative; font-family: var(--font);
    }
    .orb { position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none; }
    .o1 { width: 380px; height: 380px; background: rgba(91,140,255,0.2); top: -10%; left: -5%; }
    .o2 { width: 280px; height: 280px; background: rgba(124,92,255,0.15); bottom: 5%; right: -5%; }
    .card {
      width: 100%; max-width: 400px; padding: 2rem; position: relative; z-index: 2;
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 1.5rem; backdrop-filter: blur(20px); box-shadow: 0 24px 60px rgba(0,0,0,0.4);
    }
    .logo {
      width: 48px; height: 48px; border-radius: 14px; margin-bottom: 1.25rem;
      background: linear-gradient(135deg, #5b8cff, #7c5cff);
      display: grid; place-items: center; font-weight: 800;
      box-shadow: 0 8px 24px rgba(91,140,255,0.35);
    }
    h1 { font-size: 1.6rem; font-weight: 800; margin-bottom: 0.35rem; }
    .sub { color: #94a3b8; font-size: 0.9rem; margin-bottom: 1.5rem; }
    label { display: block; font-size: 0.8rem; color: #94a3b8; margin: 0.75rem 0 0.35rem; }
    input {
      width: 100%; padding: 0.8rem 1rem; border-radius: 0.75rem; border: 1px solid rgba(255,255,255,0.12);
      background: rgba(0,0,0,0.3); color: #fff; outline: none; transition: border-color 0.2s;
    }
    input:focus { border-color: #5b8cff; box-shadow: 0 0 0 3px rgba(91,140,255,0.2); }
    .btn {
      width: 100%; margin-top: 1.25rem; padding: 0.9rem; border: none; border-radius: 999px;
      font-weight: 700; font-size: 0.95rem; cursor: pointer; color: #fff;
      background: linear-gradient(135deg, #5b8cff, #7c5cff);
      box-shadow: 0 10px 28px rgba(91,140,255,0.35); transition: transform 0.15s;
    }
    .btn:hover:not(:disabled) { transform: translateY(-1px); }
    .btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .foot { text-align: center; margin-top: 1.25rem; font-size: 0.88rem; color: #94a3b8; }
    .foot a { color: #93c5fd; font-weight: 600; }
    .home { display: block; text-align: center; margin-top: 0.85rem; font-size: 0.82rem; color: #64748b; }
    .toast.err {
      background: rgba(248,113,113,0.12); border: 1px solid rgba(248,113,113,0.3);
      color: #fca5a5; padding: 0.7rem; border-radius: 0.65rem; margin-bottom: 0.75rem; font-size: 0.85rem;
    }
  `]
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  loading = signal(false);
  error = signal('');
  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.form.getRawValue()).subscribe({
      next: res => {
        this.loading.set(false);
        if (res.success) this.router.navigate(['/app/dashboard']);
        else this.error.set(res.message || 'Login failed');
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Login failed');
      }
    });
  }
}
