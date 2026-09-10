import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  ApiResponse,
  UserDto
} from '../models/auth.models';

const ACCESS_TOKEN_KEY = 'rs_access_token';
const REFRESH_TOKEN_KEY = 'rs_refresh_token';
const USER_KEY = 'rs_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  private currentUserSignal = signal<UserDto | null>(this.loadUser());
  currentUser = this.currentUserSignal.asReadonly();
  isAuthenticated = computed(() => !!this.currentUserSignal() && !!this.getAccessToken());

  constructor(private http: HttpClient, private router: Router) {}

  register(request: RegisterRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/register`, request).pipe(
      tap(res => {
        if (res.success && res.data) this.storeAuth(res.data);
      })
    );
  }

  login(request: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/login`, request).pipe(
      tap(res => {
        if (res.success && res.data) this.storeAuth(res.data);
      })
    );
  }

  refreshToken(): Observable<ApiResponse<AuthResponse>> {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/refresh`, {
      accessToken,
      refreshToken
    }).pipe(
      tap(res => {
        if (res.success && res.data) this.storeAuth(res.data);
      }),
      catchError(err => {
        this.logout();
        return throwError(() => err);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUserSignal.set(null);
    this.router.navigate(['/auth']);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  hasRole(role: string): boolean {
    const user = this.currentUserSignal();
    return !!user?.roles?.includes(role);
  }

  private storeAuth(data: AuthResponse): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    this.currentUserSignal.set(data.user);
  }

  private loadUser(): UserDto | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserDto;
    } catch {
      return null;
    }
  }
}
