import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.models';

export interface CreateRideRequest {
  routeId: string;
  travelDate: string; // YYYY-MM-DD
  preferredDepartureTime: string;
  seatsNeeded: number;
  genderPreference: number; // 0 Any, 1 MaleOnly, 2 FemaleOnly
  timeToleranceMinutes: number;
  notes?: string;
}

export interface RideRequestDto {
  id: string;
  userId: string;
  routeId: string;
  sourceAddress: string;
  destinationAddress: string;
  travelDate: string;
  preferredDepartureTime: string;
  seatsNeeded: number;
  genderPreference: string;
  timeToleranceMinutes: number;
  status: string;
  notes?: string;
  createdAt: string;
  matchCount: number;
}

export interface MatchResultDto {
  matchId: string;
  rideRequestId: string;
  matchedUserId: string;
  matchedUserName: string;
  isVerified: boolean;
  gender: string;
  vehicleId?: string;
  vehicleInfo?: string;
  seatingCapacity?: number;
  matchedRouteSource?: string;
  matchedRouteDestination?: string;
  matchedDepartureTime?: string;
  matchScore: number;
  scoreBreakdown?: string;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class RideRequestService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/ride-requests`;

  create(body: CreateRideRequest): Observable<ApiResponse<RideRequestDto>> {
    return this.http.post<ApiResponse<RideRequestDto>>(this.base, body);
  }

  getMy(): Observable<ApiResponse<RideRequestDto[]>> {
    return this.http.get<ApiResponse<RideRequestDto[]>>(`${this.base}/my`);
  }

  getById(id: string): Observable<ApiResponse<RideRequestDto>> {
    return this.http.get<ApiResponse<RideRequestDto>>(`${this.base}/${id}`);
  }

  cancel(id: string): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(`${this.base}/${id}/cancel`, {});
  }

  runMatch(id: string): Observable<ApiResponse<MatchResultDto[]>> {
    return this.http.post<ApiResponse<MatchResultDto[]>>(`${this.base}/${id}/match`, {});
  }

  getMatches(id: string): Observable<ApiResponse<MatchResultDto[]>> {
    return this.http.get<ApiResponse<MatchResultDto[]>>(`${this.base}/${id}/matches`);
  }

  respond(matchId: string, accept: boolean): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(`${this.base}/matches/${matchId}/respond`, { accept });
  }
}
