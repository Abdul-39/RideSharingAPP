import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.models';

export interface RatingDto {
  id: string;
  rideId: string;
  fromUserId: string;
  toUserId: string;
  stars: number;
  review?: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class RatingService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/ratings`;

  submit(rideId: string, toUserId: string, stars: number, review?: string): Observable<ApiResponse<RatingDto>> {
    return this.http.post<ApiResponse<RatingDto>>(this.base, { rideId, toUserId, stars, review });
  }

  forRide(rideId: string): Observable<ApiResponse<RatingDto[]>> {
    return this.http.get<ApiResponse<RatingDto[]>>(`${this.base}/ride/${rideId}`);
  }

  hasRated(rideId: string, toUserId: string): Observable<ApiResponse<boolean>> {
    return this.http.get<ApiResponse<boolean>>(`${this.base}/has-rated?rideId=${rideId}&toUserId=${toUserId}`);
  }
}
