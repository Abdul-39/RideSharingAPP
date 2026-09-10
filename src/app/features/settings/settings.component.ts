import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page">
      <header class="head">
        <h1>Settings</h1>
        <p>Account and app preferences</p>
      </header>

      <div class="card">
        <h2>Account</h2>
        <div class="row"><span>Name</span><strong>{{ auth.currentUser()?.firstName }} {{ auth.currentUser()?.lastName }}</strong></div>
        <div class="row"><span>Email</span><strong>{{ auth.currentUser()?.email }}</strong></div>
        <div class="row"><span>Roles</span><strong>{{ auth.currentUser()?.roles?.join(', ') }}</strong></div>
        <a routerLink="/app/profile" class="link">Edit profile →</a>
      </div>

      <div class="card">
        <h2>API connection</h2>
        <div class="row"><span>Base URL</span><strong class="mono">{{ apiUrl }}</strong></div>
        <p class="hint">Configured in environment.ts — change if your API port differs.</p>
      </div>

      <div class="card">
        <h2>Preferences</h2>
        <p class="hint">Theme and notification preferences will extend here in later phases. Core ride preferences are managed on your routes and profile.</p>
      </div>
    </div>
  `,
  styles: [`
    .head { margin-bottom: 1.25rem; }
    h1 { margin: 0; font-size: 1.5rem; }
    .head p { margin: 0.3rem 0 0; color: #94a3b8; font-size: 0.9rem; }
    .card {
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
      border-radius: 1.1rem; padding: 1.15rem 1.25rem; margin-bottom: 0.85rem;
    }
    h2 { margin: 0 0 0.75rem; font-size: 0.95rem; }
    .row {
      display: flex; justify-content: space-between; gap: 1rem; padding: 0.45rem 0;
      border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.9rem;
    }
    .row span { color: #94a3b8; }
    .mono { font-family: ui-monospace, monospace; font-size: 0.8rem; word-break: break-all; text-align: right; }
    .link { display: inline-block; margin-top: 0.75rem; color: #93c5fd; font-size: 0.88rem; text-decoration: none; }
    .hint { color: #64748b; font-size: 0.85rem; margin: 0.5rem 0 0; line-height: 1.45; }
  `]
})
export class SettingsComponent {
  auth = inject(AuthService);
  apiUrl = environment.apiUrl;
}
