import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
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
        <h1>Create account</h1>
        <p class="sub">Join as passenger or driver for daily corridors.</p>

        @if (err()) { <p class="err">{{ err() }}</p> }
        @if (msg()) { <p class="ok">{{ msg() }}</p> }

        <div class="row2">
          <label class="lbl">First name
            <input class="inp" [(ngModel)]="firstName" name="fn" />
          </label>
          <label class="lbl">Last name
            <input class="inp" [(ngModel)]="lastName" name="ln" />
          </label>
        </div>
        <label class="lbl">Email
          <input class="inp" type="email" [(ngModel)]="email" name="email" />
        </label>
        <label class="lbl">Phone
          <input class="inp" [(ngModel)]="phone" name="phone" placeholder="03XXXXXXXXX" />
        </label>
        <div class="row2">
          <label class="lbl">Password
            <input class="inp" type="password" [(ngModel)]="password" name="pw" />
          </label>
          <label class="lbl">Confirm
            <input class="inp" type="password" [(ngModel)]="confirm" name="cpw" />
          </label>
        </div>
        <label class="lbl">Role
          <select class="inp" [(ngModel)]="role" name="role">
            <option value="Passenger">Passenger</option>
            <option value="Driver">Driver</option>
          </select>
        </label>
        <label class="lbl">Gender
          <select class="inp" [(ngModel)]="gender" name="gender">
            <option value="">Optional</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </label>

        <button type="button" class="btn primary full" (click)="register()" [disabled]="busy()">
          {{ busy() ? 'Creating…' : 'Create account' }}
        </button>

        <p class="foot">
          Already have an account?
          <a routerLink="/auth/login">Sign in</a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: 100vh; display: grid; place-items: center;
      background: linear-gradient(160deg, #e8f8f1 0%, #f3faf6 40%, #fff 100%);
      padding: 1.5rem;
    }
    .auth-card {
      width: 100%; max-width: 480px; background: #fff; border: 1px solid #b7ebc9;
      border-radius: 20px; padding: 1.75rem 1.5rem;
      box-shadow: 0 16px 40px rgba(15,23,42,0.08);
    }
    .brand { display: flex; align-items: center; gap: 0.65rem; margin-bottom: 1.25rem; }
    .logo {
      width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center;
      background: linear-gradient(135deg, #0d9f6e, #14b8a6); font-size: 1.2rem;
    }
    .brand strong { display: block; color: #0d9f6e; font-size: 1.1rem; }
    .brand small { color: #64748b; font-size: 0.75rem; }
    h1 { margin: 0; font-size: 1.45rem; font-weight: 800; }
    .sub { margin: 0.35rem 0 1.1rem; color: #64748b; font-size: 0.9rem; }
    .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem; }
    @media (max-width: 480px) { .row2 { grid-template-columns: 1fr; } }
    .lbl { display: block; font-size: 0.78rem; font-weight: 700; color: #64748b; margin-bottom: 0.65rem; }
    .inp {
      display: block; width: 100%; margin-top: 0.3rem; min-height: 46px;
      padding: 0.55rem 0.85rem; border-radius: 12px; border: 1px solid #e2e8f0; font-size: 0.95rem;
    }
    .btn {
      display: inline-flex; align-items: center; justify-content: center; min-height: 48px;
      padding: 0.55rem 1.2rem; border-radius: 999px; font-weight: 800; border: none; cursor: pointer;
    }
    .btn.primary { background: #0d9f6e; color: #fff; }
    .full { width: 100%; margin-top: 0.35rem; }
    .foot { margin-top: 1.15rem; text-align: center; color: #64748b; font-size: 0.9rem; }
    .foot a { color: #0d9f6e; font-weight: 700; text-decoration: none; }
    .err { color: #e11d48; background: #fff1f2; border-radius: 10px; padding: 0.55rem 0.75rem; }
    .ok { color: #0d9f6e; }
  `]
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  firstName = '';
  lastName = '';
  email = '';
  phone = '';
  password = '';
  confirm = '';
  role = 'Passenger';
  gender = '';
  busy = signal(false);
  err = signal('');
  msg = signal('');

  register(): void {
    this.err.set(''); this.msg.set('');
    if (!this.email || !this.password || !this.firstName) {
      this.err.set('Fill required fields');
      return;
    }
    if (this.password !== this.confirm) {
      this.err.set('Passwords do not match');
      return;
    }
    this.busy.set(true);
    const body = {
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      phoneNumber: this.phone,
      password: this.password,
      confirmPassword: this.confirm,
      role: this.role,
      gender: this.gender || undefined
    };
    const a: any = this.auth;
    const call = a.register?.(body) ?? a.signUp?.(body);
    if (call?.subscribe) {
      call.subscribe({
        next: () => {
          this.busy.set(false);
          this.msg.set('Account created — sign in');
          this.router.navigateByUrl('/auth/login');
        },
        error: (e: any) => {
          this.busy.set(false);
          this.err.set(e.error?.message || e.message || 'Registration failed');
        }
      });
    } else {
      this.busy.set(false);
      this.err.set('AuthService.register not found — wire to your method');
    }
  }
}
