import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.models';

export interface WalletDto {
  id: string;
  balance: number;
  currency: string;
  isActive: boolean;
}

export interface WalletTransactionDto {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description?: string;
  relatedRideId?: string;
  createdAt: string;
}

export interface FareBreakdownDto {
  baseFare: number;
  distanceKm: number;
  distanceFare: number;
  participantCount: number;
  totalFare: number;
  sharedFarePerPassenger: number;
  currency: string;
}

export interface PaymentDto {
  id: string;
  rideId: string;
  payerUserId: string;
  payeeUserId?: string;
  method: string;
  status: string;
  amount: number;
  currency: string;
  baseFare: number;
  distanceKm: number;
  distanceFare: number;
  participantCount: number;
  sharedFare: number;
  failureReason?: string;
  createdAt: string;
  completedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentApiService {
  private http = inject(HttpClient);
  private pay = `${environment.apiUrl}/payments`;
  private wallet = `${environment.apiUrl}/wallets`;

  getWallet(): Observable<ApiResponse<WalletDto>> {
    return this.http.get<ApiResponse<WalletDto>>(`${this.wallet}/me`);
  }
  deposit(amount: number, note?: string): Observable<ApiResponse<WalletDto>> {
    return this.http.post<ApiResponse<WalletDto>>(`${this.wallet}/deposit`, { amount, note });
  }
  transactions(take = 50): Observable<ApiResponse<WalletTransactionDto[]>> {
    return this.http.get<ApiResponse<WalletTransactionDto[]>>(`${this.wallet}/transactions?take=${take}`);
  }
  estimateFare(rideId: string): Observable<ApiResponse<FareBreakdownDto>> {
    return this.http.get<ApiResponse<FareBreakdownDto>>(`${this.pay}/fare/${rideId}`);
  }
  createPayment(rideId: string, method: string): Observable<ApiResponse<PaymentDto>> {
    return this.http.post<ApiResponse<PaymentDto>>(this.pay, { rideId, method });
  }
  confirmCash(id: string): Observable<ApiResponse<PaymentDto>> {
    return this.http.post<ApiResponse<PaymentDto>>(`${this.pay}/${id}/confirm-cash`, {});
  }
  myPayments(): Observable<ApiResponse<PaymentDto[]>> {
    return this.http.get<ApiResponse<PaymentDto[]>>(`${this.pay}/my`);
  }
  ridePayments(rideId: string): Observable<ApiResponse<PaymentDto[]>> {
    return this.http.get<ApiResponse<PaymentDto[]>>(`${this.pay}/ride/${rideId}`);
  }
}
