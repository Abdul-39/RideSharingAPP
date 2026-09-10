import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.models';

export interface DriverProfile {
  id?: string;
  userId: string;
  licenseNumber?: string;
  licenseExpiryDate?: string;
  yearsOfExperience: number;
  verificationStatus: string;
  isAvailable: boolean;
  notes?: string;
  fullName: string;
  email: string;
}

export interface UpdateDriverProfileRequest {
  licenseNumber?: string;
  licenseExpiryDate?: string | null;
  yearsOfExperience: number;
  isAvailable: boolean;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class DriverService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/drivers`;

  getMe(): Observable<ApiResponse<DriverProfile>> {
    return this.http.get<ApiResponse<DriverProfile>>(`${this.base}/me`);
  }

  updateMe(body: UpdateDriverProfileRequest): Observable<ApiResponse<DriverProfile>> {
    return this.http.put<ApiResponse<DriverProfile>>(`${this.base}/me`, body);
  }
}
