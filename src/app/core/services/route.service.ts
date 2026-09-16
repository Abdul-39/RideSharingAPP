import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.models';

export interface ScheduleDto {
  id?: string;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  isActive: boolean;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
}

export interface RouteDto {
  id: string;
  userId: string;
  sourceLatitude: number;
  sourceLongitude: number;
  sourceAddress: string;
  destinationLatitude: number;
  destinationLongitude: number;
  destinationAddress: string;
  preferredDepartureTime: string;
  maximumTimeToleranceMinutes: number;
  isActive: boolean;
  createdAt: string;
  schedules: ScheduleDto[];
}

export interface CreateRouteRequest {
  sourceLatitude: number;
  sourceLongitude: number;
  sourceAddress: string;
  destinationLatitude: number;
  destinationLongitude: number;
  destinationAddress: string;
  preferredDepartureTime: string;
  maximumTimeToleranceMinutes: number;
  isActive: boolean;
  schedules: ScheduleDto[];
}

export type UpdateRouteRequest = CreateRouteRequest;

@Injectable({ providedIn: 'root' })
export class RouteService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/routes`;

  getMyRoutes(): Observable<ApiResponse<RouteDto[]>> {
    return this.http.get<ApiResponse<RouteDto[]>>(`${this.base}/my`);
  }

  getById(id: string): Observable<ApiResponse<RouteDto>> {
    return this.http.get<ApiResponse<RouteDto>>(`${this.base}/${id}`);
  }

  create(body: CreateRouteRequest): Observable<ApiResponse<RouteDto>> {
    return this.http.post<ApiResponse<RouteDto>>(this.base, body);
  }

  update(id: string, body: UpdateRouteRequest): Observable<ApiResponse<RouteDto>> {
    return this.http.put<ApiResponse<RouteDto>>(`${this.base}/${id}`, body);
  }

  delete(id: string): Observable<ApiResponse<unknown>> {
    return this.http.delete<ApiResponse<unknown>>(`${this.base}/${id}`);
  }
}
