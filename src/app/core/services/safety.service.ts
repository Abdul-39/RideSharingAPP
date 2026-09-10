import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.models';

export interface SafetySettingsDto {
  womenOnlyPreference: boolean;
  gender: string;
  averageRating?: number;
  ratingCount: number;
  isFlaggedForReview: boolean;
}

export interface EmergencyContactDto {
  id: string;
  name: string;
  phoneNumber: string;
  relationship?: string;
  isPrimary: boolean;
}

@Injectable({ providedIn: 'root' })
export class SafetyApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/safety`;

  getSettings(): Observable<ApiResponse<SafetySettingsDto>> {
    return this.http.get<ApiResponse<SafetySettingsDto>>(`${this.base}/settings`);
  }
  updateSettings(womenOnlyPreference: boolean): Observable<ApiResponse<SafetySettingsDto>> {
    return this.http.put<ApiResponse<SafetySettingsDto>>(`${this.base}/settings`, { womenOnlyPreference });
  }
  getContacts(): Observable<ApiResponse<EmergencyContactDto[]>> {
    return this.http.get<ApiResponse<EmergencyContactDto[]>>(`${this.base}/contacts`);
  }
  addContact(body: { name: string; phoneNumber: string; relationship?: string; isPrimary: boolean }) {
    return this.http.post<ApiResponse<EmergencyContactDto>>(`${this.base}/contacts`, body);
  }
  deleteContact(id: string) {
    return this.http.delete<ApiResponse<unknown>>(`${this.base}/contacts/${id}`);
  }
  triggerSos(rideId: string, latitude?: number, longitude?: number, note?: string) {
    return this.http.post<ApiResponse<unknown>>(`${this.base}/sos`, { rideId, latitude, longitude, note });
  }
}
