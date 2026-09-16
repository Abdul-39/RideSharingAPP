import { Routes } from '@angular/router';

/**
 * Your app mounts these under path: 'auth'
 * Login  → /auth  and /auth/login
 * Register → /auth/register
 */
export const AUTH_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./login.component').then(m => m.LoginComponent),
    title: 'Login'
  },
  {
    path: 'login',
    loadComponent: () => import('./login.component').then(m => m.LoginComponent),
    title: 'Login'
  },
  {
    path: 'register',
    loadComponent: () => import('./register.component').then(m => m.RegisterComponent),
    title: 'Register'
  }
];
