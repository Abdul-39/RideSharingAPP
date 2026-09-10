import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.models';

export interface Vehicle {
  id: string;
  driverId: string;
  driverName: string;
  vehicleTypeId: string;
  vehicleTypeName: string;
  make: string;
  model: string;
  registrationNumber: string;
  color?: string;
  seatingCapacity: number;
  isActive: boolean;
  createdAt: string;
}

export interface VehicleType {
  id: string;
  name: string;
  description?: string;
  defaultSeatingCapacity: number;
}

export interface CreateVehicleRequest {
  vehicleTypeId: string;
  make: string;
  model: string;
  registrationNumber: string;
  color?: string;
  seatingCapacity: number;
}

export interface UpdateVehicleRequest extends CreateVehicleRequest {
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class VehicleService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/vehicles`;

  getMyVehicles(): Observable<ApiResponse<Vehicle[]>> {
    return this.http.get<ApiResponse<Vehicle[]>>(this.base);
  }

  getById(id: string): Observable<ApiResponse<Vehicle>> {
    return this.http.get<ApiResponse<Vehicle>>(`${this.base}/${id}`);
  }

  getTypes(): Observable<ApiResponse<VehicleType[]>> {
    return this.http.get<ApiResponse<VehicleType[]>>(`${this.base}/types`);
  }

  create(body: CreateVehicleRequest): Observable<ApiResponse<Vehicle>> {
    return this.http.post<ApiResponse<Vehicle>>(this.base, body);
  }

  update(id: string, body: UpdateVehicleRequest): Observable<ApiResponse<Vehicle>> {
    return this.http.put<ApiResponse<Vehicle>>(`${this.base}/${id}`, body);
  }

  delete(id: string): Observable<ApiResponse<unknown>> {
    return this.http.delete<ApiResponse<unknown>>(`${this.base}/${id}`);
  }
}
