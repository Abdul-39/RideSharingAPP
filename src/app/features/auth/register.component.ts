import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="page">
      <div class="orb o1"></div>
      <div class="orb o2"></div>
      <div class="card animate-in">
        <div class="logo">RS</div>
        <h1>Create account</h1>
        <p class="sub">Join verified daily commuters on your route</p>

        @if (errorMessage()) { <div class="toast err">{{ errorMessage() }}</div> }
        @if (errors().length) {
          <div class="toast err"><ul>@for (e of errors(); track e) { <li>{{ e }}</li> }</ul></div>
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="row">
            <div class="field"><label>First name</label><input formControlName="firstName" /></div>
            <div class="field"><label>Last name</label><input formControlName="lastName" /></div>
          </div>
          <div class="field"><label>Email</label><input type="email" formControlName="email" /></div>
          <div class="field"><label>Phone</label><input formControlName="phoneNumber" placeholder="03XXXXXXXXX" /></div>
          <div class="field"><label>Password</label><input type="password" formControlName="password" /></div>
          <div class="field"><label>Confirm password</label><input type="password" formControlName="confirmPassword" /></div>
          <div class="row">
            <div class="field">
              <label>Gender</label>
              <select formControlName="gender">
                <option [value]="1">Male</option>
                <option [value]="2">Female</option>
                <option [value]="3">Other</option>
                <option [value]="4">Prefer not to say</option>
              </select>
            </div>
            <div class="field">
              <label>Register as</label>
              <select formControlName="role">
                <option value="Passenger">Passenger</option>
                <option value="Driver">Driver</option>
              </select>
            </div>
          </div>
          <button type="submit" class="btn" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Creating…' : 'Create account' }}
          </button>
        </form>
        <p class="foot">Already have an account? <a routerLink="/auth">Sign in</a></p>
      </div>
    </div>
  `,
  styles: [`
    .page { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:1.5rem; position:relative; font-family:var(--font); }
    .orb { position:absolute; border-radius:50%; filter:blur(80px); pointer-events:none; }
    .o1 { width:360px; height:360px; background:rgba(91,140,255,.18); top:-8%; right:-5%; }
    .o2 { width:260px; height:260px; background:rgba(34,211,238,.1); bottom:5%; left:-5%; }
    .card {
      width:100%; max-width:440px; padding:2rem; position:relative; z-index:2;
      background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1); border-radius:1.5rem;
      backdrop-filter:blur(20px); box-shadow:0 24px 60px rgba(0,0,0,.4);
    }
    .logo {
      width:48px; height:48px; border-radius:14px; margin-bottom:1rem;
      background:linear-gradient(135deg,#5b8cff,#7c5cff); display:grid; place-items:center; font-weight:800;
      box-shadow:0 8px 24px rgba(91,140,255,.35);
    }
    h1 { font-size:1.5rem; font-weight:800; margin-bottom:.3rem; }
    .sub { color:#94a3b8; font-size:.88rem; margin-bottom:1.25rem; }
    .row { display:grid; grid-template-columns:1fr 1fr; gap:.65rem; }
    .field { margin-bottom:.75rem; }
    label { display:block; font-size:.78rem; color:#94a3b8; margin-bottom:.3rem; }
    input, select {
      width:100%; padding:.75rem .9rem; border-radius:.75rem; border:1px solid rgba(255,255,255,.12);
      background:rgba(0,0,0,.3); color:#fff; outline:none;
    }
    input:focus, select:focus { border-color:#5b8cff; box-shadow:0 0 0 3px rgba(91,140,255,.2); }
    .btn {
      width:100%; margin-top:.85rem; padding:.9rem; border:none; border-radius:999px; font-weight:700;
      color:#fff; cursor:pointer; background:linear-gradient(135deg,#5b8cff,#7c5cff);
      box-shadow:0 10px 28px rgba(91,140,255,.35);
    }
    .btn:disabled { opacity:.55; cursor:not-allowed; }
    .foot { text-align:center; margin-top:1.1rem; font-size:.88rem; color:#94a3b8; }
    .foot a { color:#93c5fd; font-weight:600; }
    .toast.err {
      background:rgba(248,113,113,.12); border:1px solid rgba(248,113,113,.3);
      color:#fca5a5; padding:.7rem; border-radius:.65rem; margin-bottom:.75rem; font-size:.85rem;
    }
    ul { margin:0; padding-left:1.1rem; }
  `]
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: [''],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
    gender: [1, Validators.required],
    role: ['Passenger' as 'Passenger' | 'Driver', Validators.required]
  });

  loading = signal(false);
  errorMessage = signal('');
  errors = signal<string[]>([]);

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errorMessage.set('');
    this.errors.set([]);
    const value = this.form.getRawValue();
    this.auth.register({ ...value, gender: Number(value.gender) }).subscribe({
      next: res => {
        this.loading.set(false);
        if (res.success) this.router.navigate(['/app/dashboard']);
        else {
          this.errorMessage.set(res.message || 'Registration failed');
          this.errors.set(res.errors || []);
        }
      },
      error: err => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || 'Registration failed');
        this.errors.set(err.error?.errors || []);
      }
    });
  }
}
