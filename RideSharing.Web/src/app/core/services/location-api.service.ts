import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.models';

export interface GeoPoint { latitude: number; longitude: number; }
export interface UpdateLocationRequest {
  latitude: number; longitude: number; accuracyMeters?: number;
  label?: string; shareMode?: number; activeRideId?: string;
}
export interface UserLocationDto {
  id: string; userId: string; latitude: number; longitude: number;
  accuracyMeters?: number; recordedAt: string; label?: string;
  isCurrent: boolean; shareMode: string; activeRideId?: string;
}
export interface RouteCalculationResult {
  distanceKm: number; durationMinutes: number; summary?: string;
  polylinePoints: GeoPoint[]; usedLiveMapsProvider: boolean; provider: string;
}
export interface NearbyDriverDto {
  userId: string; fullName: string; latitude: number; longitude: number;
  distanceKm: number; recordedAt: string; vehicleInfo?: string;
}
export interface PlaceSearchResult {
  displayName: string;
  latitude: number;
  longitude: number;
}

@Injectable({ providedIn: 'root' })
export class LocationApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/locations`;
  private geoBase = `${environment.apiUrl}/geo`;

  updateMine(body: UpdateLocationRequest) {
    return this.http.post<ApiResponse<UserLocationDto>>(`${this.base}/me`, body);
  }
  getMine() {
    return this.http.get<ApiResponse<UserLocationDto | null>>(`${this.base}/me`);
  }
  calculateRoute(originLat: number, originLng: number, destinationLat: number, destinationLng: number) {
    return this.http.post<ApiResponse<RouteCalculationResult>>(`${this.base}/route`, {
      originLat, originLng, destinationLat, destinationLng
    });
  }
  nearbyDrivers(lat: number, lng: number, radiusKm = 5) {
    const params = new HttpParams().set('lat', lat).set('lng', lng).set('radiusKm', radiusKm);
    return this.http.get<ApiResponse<NearbyDriverDto[]>>(`${this.base}/nearby-drivers`, { params });
  }
  search(q: string) {
    return this.http.get<ApiResponse<PlaceSearchResult[]>>(`${this.geoBase}/search`, {
      params: new HttpParams().set('q', q)
    });
  }
}
