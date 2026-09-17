import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ApiResponse<T> { success: boolean; message: string; data?: T; errors?: string[]; }
export interface PaginatedResult<T> { items: T[]; totalCount: number; page: number; pageSize: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean; }

export interface AdminDashboard { totalUsers: number; activeUsers: number; drivers: number; passengers: number; activeRides: number; completedRides: number; cancelledRides: number; totalRides: number; revenue: number; currency: string; averageRating: number; totalRatings: number; verificationRequestsPending: number; verificationRequestsTotal: number; institutionsTotal: number; vehiclesTotal: number; routesTotal: number; paymentsTotal: number; }

export interface UserListItem { id: string; firstName: string; lastName: string; fullName: string; email: string; phoneNumber?: string; gender: string; isActive: boolean; isVerified: boolean; institutionId?: string; institutionName?: string; roles: string[]; averageRating?: number; ratingCount: number; isFlaggedForReview: boolean; createdAt: string; profileImageUrl?: string; }
export interface UserDetail extends UserListItem { dateOfBirth?: string; cnicLast4?: string; studentOrEmployeeId?: string; womenOnlyPreference: boolean; updatedAt?: string; vehicleCount: number; routeCount: number; rideCount: number; }
export interface UserRideHistory { rideId: string; sourceAddress: string; destinationAddress: string; travelDate: string; scheduledDepartureTime: string; status: string; role: string; createdAt: string; completedAt?: string; fareAmount?: number; }

export interface DriverListItem { userId: string; driverProfileId?: string; fullName: string; email: string; phoneNumber?: string; isActive: boolean; verificationStatus: string; isAvailable: boolean; yearsOfExperience: number; licenseNumber?: string; licenseExpiryDate?: string; vehicleCount: number; averageRating?: number; ratingCount: number; createdAt: string; }
export interface DriverVehicle { id: string; vehicleTypeId: string; vehicleTypeName: string; make: string; model: string; registrationNumber: string; color?: string; seatingCapacity: number; isActive: boolean; createdAt: string; }

export interface Institution { id: string; name: string; type: string; typeId: number; address?: string; verificationStatus: string; verificationStatusId: number; isDeleted: boolean; userCount: number; createdAt: string; updatedAt?: string; }

export interface PopularRoute { sourceAddress: string; destinationAddress: string; rideCount: number; routeUsageCount: number; totalRevenue?: number; sourceLatitude: number; sourceLongitude: number; destinationLatitude: number; destinationLongitude: number; }
export interface DailyRideCount { date: string; label: string; total: number; completed: number; cancelled: number; active: number; }
export interface RideReports { totalRides: number; dailyRides: number; weeklyRides: number; monthlyRides: number; completedRides: number; cancelledRides: number; activeRides: number; popularRoutes: PopularRoute[]; dailyTrend: DailyRideCount[]; monthlyTrend: DailyRideCount[]; }

export interface PaymentReports { totalPayments: number; totalAmount: number; cashCount: number; cashAmount: number; walletCount: number; walletAmount: number; completedCount: number; completedAmount: number; failedCount: number; failedAmount: number; refundedCount: number; refundedAmount: number; pendingCount: number; pendingAmount: number; currency: string; dailyTrend: { date: string; label: string; count: number; amount: number }[]; }

export interface RatingReports { averageRating: number; totalRatings: number; ratingDistribution: Record<string, number>; lowRatedUsers: { userId: string; fullName: string; email: string; averageRating?: number; ratingCount: number; isFlaggedForReview: boolean; flagReason?: string; roles: string[] }[]; trend: { date: string; label: string; average: number; count: number }[]; }

export interface ChartPoint { label: string; value: number; extra?: string; date?: string; }
export interface Analytics { usersByDay: ChartPoint[]; usersByMonth: ChartPoint[]; ridesByDay: ChartPoint[]; ridesByMonth: ChartPoint[]; revenueByDay: ChartPoint[]; revenueByMonth: ChartPoint[]; popularRoutes: PopularRoute[]; ridesByStatus: Record<string, number>; paymentsByMethod: Record<string, number>; paymentsByStatus: Record<string, number>; }

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private base = (environment.apiUrl || '/api/v1').replace(/\/$/, '') + '/admin';

  // Dashboard
  getDashboard(): Observable<ApiResponse<AdminDashboard>> {
    return this.http.get<ApiResponse<AdminDashboard>>(`${this.base}/dashboard`);
  }

  // Users
  getUsers(params: { search?: string; role?: string; isActive?: boolean; isVerified?: boolean; page?: number; pageSize?: number; sortBy?: string; sortDir?: string }): Observable<ApiResponse<PaginatedResult<UserListItem>>> {
    let hp = new HttpParams();
    if (params.search) hp = hp.set('search', params.search);
    if (params.role) hp = hp.set('role', params.role);
    if (params.isActive !== undefined && params.isActive !== null) hp = hp.set('isActive', String(params.isActive));
    if (params.isVerified !== undefined && params.isVerified !== null) hp = hp.set('isVerified', String(params.isVerified));
    if (params.page) hp = hp.set('page', String(params.page));
    if (params.pageSize) hp = hp.set('pageSize', String(params.pageSize));
    if (params.sortBy) hp = hp.set('sortBy', params.sortBy);
    if (params.sortDir) hp = hp.set('sortDir', params.sortDir);
    return this.http.get<ApiResponse<PaginatedResult<UserListItem>>>(`${this.base}/users`, { params: hp });
  }
  getUser(id: string): Observable<ApiResponse<UserDetail>> {
    return this.http.get<ApiResponse<UserDetail>>(`${this.base}/users/${id}`);
  }
  toggleUserActive(id: string, isActive: boolean): Observable<ApiResponse<UserDetail>> {
    return this.http.put<ApiResponse<UserDetail>>(`${this.base}/users/${id}/toggle-active`, { isActive });
  }
  getUserRides(id: string, page = 1, pageSize = 10): Observable<ApiResponse<PaginatedResult<UserRideHistory>>> {
    const hp = new HttpParams().set('page', String(page)).set('pageSize', String(pageSize));
    return this.http.get<ApiResponse<PaginatedResult<UserRideHistory>>>(`${this.base}/users/${id}/rides`, { params: hp });
  }

  // Drivers
  getDrivers(params: { search?: string; verificationStatus?: string; isActive?: boolean; page?: number; pageSize?: number; sortBy?: string; sortDir?: string }): Observable<ApiResponse<PaginatedResult<DriverListItem>>> {
    let hp = new HttpParams();
    if (params.search) hp = hp.set('search', params.search);
    if (params.verificationStatus) hp = hp.set('verificationStatus', params.verificationStatus);
    if (params.isActive !== undefined && params.isActive !== null) hp = hp.set('isActive', String(params.isActive));
    if (params.page) hp = hp.set('page', String(params.page));
    if (params.pageSize) hp = hp.set('pageSize', String(params.pageSize));
    if (params.sortBy) hp = hp.set('sortBy', params.sortBy);
    if (params.sortDir) hp = hp.set('sortDir', params.sortDir);
    return this.http.get<ApiResponse<PaginatedResult<DriverListItem>>>(`${this.base}/drivers`, { params: hp });
  }
  toggleDriverActive(id: string, isActive: boolean): Observable<ApiResponse<DriverListItem>> {
    return this.http.put<ApiResponse<DriverListItem>>(`${this.base}/drivers/${id}/toggle-active`, { isActive });
  }
  getDriverVehicles(id: string): Observable<ApiResponse<DriverVehicle[]>> {
    return this.http.get<ApiResponse<DriverVehicle[]>>(`${this.base}/drivers/${id}/vehicles`);
  }

  // Institutions
  getInstitutions(params: { search?: string; verificationStatus?: string; includeDeleted?: boolean; page?: number; pageSize?: number }): Observable<ApiResponse<PaginatedResult<Institution>>> {
    let hp = new HttpParams();
    if (params.search) hp = hp.set('search', params.search);
    if (params.verificationStatus) hp = hp.set('verificationStatus', params.verificationStatus);
    if (params.includeDeleted !== undefined) hp = hp.set('includeDeleted', String(params.includeDeleted));
    if (params.page) hp = hp.set('page', String(params.page));
    if (params.pageSize) hp = hp.set('pageSize', String(params.pageSize));
    return this.http.get<ApiResponse<PaginatedResult<Institution>>>(`${this.base}/institutions`, { params: hp });
  }
  getInstitution(id: string): Observable<ApiResponse<Institution>> {
    return this.http.get<ApiResponse<Institution>>(`${this.base}/institutions/${id}`);
  }
  createInstitution(body: { name: string; type: number; address?: string }): Observable<ApiResponse<Institution>> {
    return this.http.post<ApiResponse<Institution>>(`${this.base}/institutions`, body);
  }
  updateInstitution(id: string, body: { name: string; type: number; address?: string }): Observable<ApiResponse<Institution>> {
    return this.http.put<ApiResponse<Institution>>(`${this.base}/institutions/${id}`, body);
  }
  verifyInstitution(id: string, status: string): Observable<ApiResponse<Institution>> {
    return this.http.post<ApiResponse<Institution>>(`${this.base}/institutions/${id}/verify`, { verificationStatus: status });
  }
  deactivateInstitution(id: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.base}/institutions/${id}/deactivate`, {});
  }
  restoreInstitution(id: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.base}/institutions/${id}/restore`, {});
  }

  // Reports
  getRideReports(from?: string, to?: string, granularity?: string): Observable<ApiResponse<RideReports>> {
    let hp = new HttpParams();
    if (from) hp = hp.set('from', from);
    if (to) hp = hp.set('to', to);
    if (granularity) hp = hp.set('granularity', granularity);
    return this.http.get<ApiResponse<RideReports>>(`${this.base}/reports/rides`, { params: hp });
  }
  getPaymentReports(from?: string, to?: string): Observable<ApiResponse<PaymentReports>> {
    let hp = new HttpParams();
    if (from) hp = hp.set('from', from);
    if (to) hp = hp.set('to', to);
    return this.http.get<ApiResponse<PaymentReports>>(`${this.base}/reports/payments`, { params: hp });
  }
  getRatingReports(): Observable<ApiResponse<RatingReports>> {
    return this.http.get<ApiResponse<RatingReports>>(`${this.base}/reports/ratings`);
  }
  getAnalytics(period?: string): Observable<ApiResponse<Analytics>> {
    let hp = new HttpParams();
    if (period) hp = hp.set('period', period);
    return this.http.get<ApiResponse<Analytics>>(`${this.base}/reports/analytics`, { params: hp });
  }
}
