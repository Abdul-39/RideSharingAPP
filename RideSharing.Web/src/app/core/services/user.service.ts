import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.models';

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  gender: string;
  dateOfBirth?: string;
  profileImageUrl?: string;
  isVerified: boolean;
  isActive: boolean;
  institutionId?: string;
  institutionName?: string;
  roles: string[];
}

export interface UpdateProfileRequest {
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  gender: number;
  dateOfBirth?: string | null;
  institutionId?: string | null;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/users`;

  getMe(): Observable<ApiResponse<UserProfile>> {
    return this.http.get<ApiResponse<UserProfile>>(`${this.base}/me`);
  }

  updateMe(body: UpdateProfileRequest): Observable<ApiResponse<UserProfile>> {
    return this.http.put<ApiResponse<UserProfile>>(`${this.base}/me`, body);
  }

  uploadProfileImage(file: File): Observable<ApiResponse<UserProfile>> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ApiResponse<UserProfile>>(`${this.base}/profile-image`, form);
  }
}
