using RideSharing.Application.Common;
using RideSharing.Application.DTOs.Admin;

namespace RideSharing.Application.Interfaces;

public interface IAdminService
{
    // Dashboard
    Task<ApiResponse<AdminDashboardDto>> GetDashboardAsync();

    // User management
    Task<ApiResponse<PaginatedResultDto<UserListItemDto>>> GetUsersAsync(
        string? search, string? role, bool? isActive, bool? isVerified,
        int page, int pageSize, string? sortBy, string? sortDir);

    Task<ApiResponse<UserDetailDto>> GetUserByIdAsync(Guid userId);
    Task<ApiResponse<UserDetailDto>> ToggleUserActiveAsync(Guid userId, bool isActive);
    Task<ApiResponse<PaginatedResultDto<UserRideHistoryDto>>> GetUserRideHistoryAsync(Guid userId, int page, int pageSize);

    // Driver management
    Task<ApiResponse<PaginatedResultDto<DriverListItemDto>>> GetDriversAsync(
        string? search, string? verificationStatus, bool? isActive,
        int page, int pageSize, string? sortBy, string? sortDir);

    Task<ApiResponse<DriverListItemDto>> ToggleDriverActiveAsync(Guid userId, bool isActive);
    Task<ApiResponse<List<DriverVehicleDto>>> GetDriverVehiclesAsync(Guid userId);

    // Institution management
    Task<ApiResponse<PaginatedResultDto<InstitutionDto>>> GetInstitutionsAsync(
        string? search, string? verificationStatus, bool? includeDeleted,
        int page, int pageSize);

    Task<ApiResponse<InstitutionDto>> GetInstitutionByIdAsync(Guid id);
    Task<ApiResponse<InstitutionDto>> CreateInstitutionAsync(CreateInstitutionRequest request);
    Task<ApiResponse<InstitutionDto>> UpdateInstitutionAsync(Guid id, UpdateInstitutionRequest request);
    Task<ApiResponse<InstitutionDto>> VerifyInstitutionAsync(Guid id, string verificationStatus);
    Task<ApiResponse> DeactivateInstitutionAsync(Guid id);
    Task<ApiResponse> RestoreInstitutionAsync(Guid id);

    // Reports
    Task<ApiResponse<RideReportsDto>> GetRideReportsAsync(DateOnly? from, DateOnly? to, string? granularity);
    Task<ApiResponse<PaymentReportsDto>> GetPaymentReportsAsync(DateOnly? from, DateOnly? to);
    Task<ApiResponse<RatingReportsDto>> GetRatingReportsAsync();
    Task<ApiResponse<AnalyticsDto>> GetAnalyticsAsync(string? period);
}
