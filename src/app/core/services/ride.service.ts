import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.models';

export interface RideParticipantDto { userId: string; fullName: string; role: string; hasConfirmed: boolean; }
export interface RideHistoryItemDto { fromStatus: string; toStatus: string; note?: string; changedAt: string; }
export interface RideDto {
  id: string; routeId: string; sourceAddress: string; destinationAddress: string;
  travelDate: string; scheduledDepartureTime: string; status: string;
  vehicleId?: string; vehicleInfo?: string; fareAmount?: number; cancellationReason?: string;
  confirmedAt?: string; startedAt?: string; completedAt?: string; createdAt: string;
  participants: RideParticipantDto[]; history: RideHistoryItemDto[];
}

@Injectable({ providedIn: 'root' })
export class RideService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/rides`;
  createFromMatch(matchId: string) { return this.http.post<ApiResponse<RideDto>>(this.base, { matchId }); }
  getMy(filter?: string) {
    const q = filter ? `?filter=${filter}` : '';
    return this.http.get<ApiResponse<RideDto[]>>(`${this.base}/my${q}`);
  }
  getById(id: string) { return this.http.get<ApiResponse<RideDto>>(`${this.base}/${id}`); }
  confirm(id: string) { return this.http.post<ApiResponse<RideDto>>(`${this.base}/${id}/confirm`, {}); }
  driverArriving(id: string) { return this.http.post<ApiResponse<RideDto>>(`${this.base}/${id}/driver-arriving`, {}); }
  driverArrived(id: string) { return this.http.post<ApiResponse<RideDto>>(`${this.base}/${id}/driver-arrived`, {}); }
  start(id: string) { return this.http.post<ApiResponse<RideDto>>(`${this.base}/${id}/start`, {}); }
  complete(id: string) { return this.http.post<ApiResponse<RideDto>>(`${this.base}/${id}/complete`, {}); }
  cancel(id: string, reason?: string) { return this.http.post<ApiResponse<RideDto>>(`${this.base}/${id}/cancel`, { reason }); }
}
