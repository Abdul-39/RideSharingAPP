import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, from, of, tap, catchError, throwError, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  ApiResponse,
  UserDto
} from '../models/auth.models';
import { TokenStorageService } from './token-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private http = inject(HttpClient);
  private router = inject(Router);
  private storage = inject(TokenStorageService);

  private currentUserSignal = signal<UserDto | null>(null);
  currentUser = this.currentUserSignal.asReadonly();
  isAuthenticated = computed(() => !!this.currentUserSignal() && !!this.getAccessToken());

  constructor() {
    this.currentUserSignal.set(this.loadUser());
    void this.storage.whenReady().then(() => {
      this.currentUserSignal.set(this.loadUser());
    });
  }

  register(request: RegisterRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/register`, request).pipe(
      switchMap(res => this.afterAuth(res))
    );
  }

  login(request: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/login`, request).pipe(
      switchMap(res => this.afterAuth(res))
    );
  }

  refreshToken(): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/refresh`, {
      accessToken: this.getAccessToken(),
      refreshToken: this.getRefreshToken()
    }).pipe(
      switchMap(res => this.afterAuth(res)),
      catchError(err => {
        void this.logout();
        return throwError(() => err);
      })
    );
  }

  async logout(): Promise<void> {
    await this.storage.clearAuth();
    this.currentUserSignal.set(null);
    await this.router.navigateByUrl('/auth/login');
  }

  getAccessToken(): string | null {
    return this.storage.get('access_token');
  }

  getRefreshToken(): string | null {
    return this.storage.get('refresh_token');
  }

  hasRole(role: string): boolean {
    return !!this.currentUserSignal()?.roles?.includes(role);
  }

  private afterAuth(res: ApiResponse<AuthResponse>): Observable<ApiResponse<AuthResponse>> {
    if (res.success && res.data) {
      return from(this.storeAuth(res.data)).pipe(switchMap(() => of(res)));
    }
    return of(res);
  }

  private async storeAuth(data: AuthResponse): Promise<void> {
    await this.storage.set('access_token', data.accessToken);
    await this.storage.set('refresh_token', data.refreshToken);
    await this.storage.set('user', JSON.stringify(data.user));
    this.currentUserSignal.set(data.user);
  }

  private loadUser(): UserDto | null {
    const raw = this.storage.get('user');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserDto;
    } catch {
      return null;
    }
  }
}
