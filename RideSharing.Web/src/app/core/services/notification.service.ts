import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.models';

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  relatedEntityId?: string;
  linkUrl?: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/notifications`;
  unreadCount = signal(0);

  getMine(take = 50): Observable<ApiResponse<NotificationDto[]>> {
    return this.http.get<ApiResponse<NotificationDto[]>>(`${this.base}?take=${take}`);
  }

  refreshUnread(): void {
    this.http.get<ApiResponse<{ count: number }>>(`${this.base}/unread-count`).subscribe({
      next: res => { if (res.success && res.data) this.unreadCount.set(res.data.count); }
    });
  }

  markRead(id: string): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(`${this.base}/${id}/read`, {}).pipe(
      tap(() => this.refreshUnread())
    );
  }

  markAllRead(): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(`${this.base}/read-all`, {}).pipe(
      tap(() => this.unreadCount.set(0))
    );
  }

  prependLocal(n: NotificationDto): void {
    if (!n.isRead) this.unreadCount.update(c => c + 1);
  }
}
