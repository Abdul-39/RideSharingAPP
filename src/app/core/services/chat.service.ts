import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.models';

export interface ChatMessageDto {
  id: string;
  rideId: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  message: string;
  sentAt: string;
  isRead: boolean;
  isMine: boolean;
}

export interface ChatThreadDto {
  rideId: string;
  title: string;
  status: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/chats`;

  getThreads(): Observable<ApiResponse<ChatThreadDto[]>> {
    return this.http.get<ApiResponse<ChatThreadDto[]>>(this.base);
  }

  getMessages(rideId: string): Observable<ApiResponse<ChatMessageDto[]>> {
    return this.http.get<ApiResponse<ChatMessageDto[]>>(`${this.base}/${rideId}`);
  }

  send(rideId: string, message: string): Observable<ApiResponse<ChatMessageDto>> {
    return this.http.post<ApiResponse<ChatMessageDto>>(`${this.base}/${rideId}/messages`, { message });
  }

  markRead(rideId: string): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(`${this.base}/${rideId}/read`, {});
  }
}
