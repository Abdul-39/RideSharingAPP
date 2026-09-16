import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-slate-900 text-white px-4">
      <div class="w-full max-w-md p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur">
        <h2 class="text-2xl font-bold mb-2 text-center">Welcome Back</h2>
        <p class="text-slate-400 text-center mb-8 text-sm">Authentication will be implemented in Phase 1</p>
        <div class="space-y-4">
          <div class="h-12 rounded-lg bg-white/10 animate-pulse"></div>
          <div class="h-12 rounded-lg bg-white/10 animate-pulse"></div>
          <div class="h-12 rounded-lg bg-blue-600/50 flex items-center justify-center font-medium">
            Login (Coming in Phase 1)
          </div>
        </div>
        <p class="text-center mt-6 text-sm">
          <a routerLink="/" class="text-blue-400 hover:underline">← Back to Home</a>
        </p>
      </div>
    </div>
  `
})
export class AuthComponent {}
