using RideSharing.Domain.Enums;

namespace RideSharing.Application.DTOs.Admin;

// Generic pagination wrapper
public class PaginatedResultDto<T>
{
    public List<T> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => PageSize == 0 ? 0 : (int)Math.Ceiling((double)TotalCount / PageSize);
    public bool HasNextPage => Page < TotalPages;
    public bool HasPreviousPage => Page > 1;
}

// Dashboard
public class AdminDashboardDto
{
    public int TotalUsers { get; set; }
    public int ActiveUsers { get; set; }
    public int Drivers { get; set; }
    public int Passengers { get; set; }
    public int ActiveRides { get; set; }
    public int CompletedRides { get; set; }
    public int CancelledRides { get; set; }
    public int TotalRides { get; set; }
    public decimal Revenue { get; set; }
    public string Currency { get; set; } = "PKR";
    public double AverageRating { get; set; }
    public int TotalRatings { get; set; }
    public int VerificationRequestsPending { get; set; }
    public int VerificationRequestsTotal { get; set; }
    public int InstitutionsTotal { get; set; }
    public int VehiclesTotal { get; set; }
    public int RoutesTotal { get; set; }
    public int PaymentsTotal { get; set; }
}

// User management
public class UserListItemDto
{
    public Guid Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string FullName => $"{FirstName} {LastName}".Trim();
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string Gender { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public bool IsVerified { get; set; }
    public Guid? InstitutionId { get; set; }
    public string? InstitutionName { get; set; }
    public List<string> Roles { get; set; } = new();
    public decimal? AverageRating { get; set; }
    public int RatingCount { get; set; }
    public bool IsFlaggedForReview { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? ProfileImageUrl { get; set; }
}

public class UserDetailDto : UserListItemDto
{
    public DateOnly? DateOfBirth { get; set; }
    public string? CnicLast4 { get; set; }
    public string? StudentOrEmployeeId { get; set; }
    public bool WomenOnlyPreference { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public int VehicleCount { get; set; }
    public int RouteCount { get; set; }
    public int RideCount { get; set; }
}

public class UserRideHistoryDto
{
    public Guid RideId { get; set; }
    public string SourceAddress { get; set; } = string.Empty;
    public string DestinationAddress { get; set; } = string.Empty;
    public DateOnly TravelDate { get; set; }
    public string ScheduledDepartureTime { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty; // Passenger / Driver
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public decimal? FareAmount { get; set; }
}

public class ToggleUserActiveRequest
{
    public bool IsActive { get; set; }
}

// Driver management
public class DriverListItemDto
{
    public Guid UserId { get; set; }
    public Guid? DriverProfileId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public bool IsActive { get; set; }
    public string VerificationStatus { get; set; } = string.Empty;
    public bool IsAvailable { get; set; }
    public int YearsOfExperience { get; set; }
    public string? LicenseNumber { get; set; }
    public DateOnly? LicenseExpiryDate { get; set; }
    public int VehicleCount { get; set; }
    public decimal? AverageRating { get; set; }
    public int RatingCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class DriverVehicleDto
{
    public Guid Id { get; set; }
    public Guid VehicleTypeId { get; set; }
    public string VehicleTypeName { get; set; } = string.Empty;
    public string Make { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string RegistrationNumber { get; set; } = string.Empty;
    public string? Color { get; set; }
    public int SeatingCapacity { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

// Institution management
public class InstitutionDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public int TypeId { get; set; }
    public string? Address { get; set; }
    public string VerificationStatus { get; set; } = string.Empty;
    public int VerificationStatusId { get; set; }
    public bool IsDeleted { get; set; }
    public int UserCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateInstitutionRequest
{
    public string Name { get; set; } = string.Empty;
    public int Type { get; set; } // InstitutionType enum int
    public string? Address { get; set; }
}

public class UpdateInstitutionRequest
{
    public string Name { get; set; } = string.Empty;
    public int Type { get; set; }
    public string? Address { get; set; }
}

public class VerifyInstitutionRequest
{
    public string VerificationStatus { get; set; } = string.Empty; // Verified, Pending, Rejected
}

// Ride reports
public class PopularRouteDto
{
    public string SourceAddress { get; set; } = string.Empty;
    public string DestinationAddress { get; set; } = string.Empty;
    public int RideCount { get; set; }
    public int RouteUsageCount { get; set; }
    public decimal? TotalRevenue { get; set; }
    // optional coordinates for mapping
    public decimal SourceLatitude { get; set; }
    public decimal SourceLongitude { get; set; }
    public decimal DestinationLatitude { get; set; }
    public decimal DestinationLongitude { get; set; }
}

public class DailyRideCountDto
{
    public DateOnly Date { get; set; }
    public string Label { get; set; } = string.Empty; // e.g. 2026-09-17 or Mon
    public int Total { get; set; }
    public int Completed { get; set; }
    public int Cancelled { get; set; }
    public int Active { get; set; }
}

public class RideReportsDto
{
    public int TotalRides { get; set; }
    public int DailyRides { get; set; } // today
    public int WeeklyRides { get; set; } // last 7 days
    public int MonthlyRides { get; set; } // last 30 days
    public int CompletedRides { get; set; }
    public int CancelledRides { get; set; }
    public int ActiveRides { get; set; }
    public List<PopularRouteDto> PopularRoutes { get; set; } = new();
    public List<DailyRideCountDto> DailyTrend { get; set; } = new(); // last 7 or 30 days based on filter
    public List<DailyRideCountDto> MonthlyTrend { get; set; } = new(); // last 6 months aggregated monthly
}

// Payment reports
public class PaymentReportsDto
{
    public int TotalPayments { get; set; }
    public decimal TotalAmount { get; set; }
    public int CashCount { get; set; }
    public decimal CashAmount { get; set; }
    public int WalletCount { get; set; }
    public decimal WalletAmount { get; set; }
    public int CompletedCount { get; set; }
    public decimal CompletedAmount { get; set; }
    public int FailedCount { get; set; }
    public decimal FailedAmount { get; set; }
    public int RefundedCount { get; set; }
    public decimal RefundedAmount { get; set; }
    public int PendingCount { get; set; }
    public decimal PendingAmount { get; set; }
    public string Currency { get; set; } = "PKR";
    public List<DailyPaymentDto> DailyTrend { get; set; } = new();
}

public class DailyPaymentDto
{
    public DateOnly Date { get; set; }
    public string Label { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal Amount { get; set; }
}

// Rating reports
public class RatingReportsDto
{
    public double AverageRating { get; set; }
    public int TotalRatings { get; set; }
    public Dictionary<string, int> RatingDistribution { get; set; } = new(); // "5"-> count
    public List<LowRatedUserDto> LowRatedUsers { get; set; } = new();
    public List<DailyRatingDto> Trend { get; set; } = new();
}

public class LowRatedUserDto
{
    public Guid UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public decimal? AverageRating { get; set; }
    public int RatingCount { get; set; }
    public bool IsFlaggedForReview { get; set; }
    public string? FlagReason { get; set; }
    public List<string> Roles { get; set; } = new();
}

public class DailyRatingDto
{
    public DateOnly Date { get; set; }
    public string Label { get; set; } = string.Empty;
    public double Average { get; set; }
    public int Count { get; set; }
}

// Analytics
public class ChartPointDto
{
    public string Label { get; set; } = string.Empty;
    public double Value { get; set; }
    public string? Extra { get; set; }
    public DateTime? Date { get; set; }
}

public class AnalyticsDto
{
    // Users over time
    public List<ChartPointDto> UsersByDay { get; set; } = new(); // last 7 days
    public List<ChartPointDto> UsersByMonth { get; set; } = new(); // last 6 months
    // Rides
    public List<ChartPointDto> RidesByDay { get; set; } = new();
    public List<ChartPointDto> RidesByMonth { get; set; } = new();
    // Revenue
    public List<ChartPointDto> RevenueByDay { get; set; } = new();
    public List<ChartPointDto> RevenueByMonth { get; set; } = new();
    // Popular routes
    public List<PopularRouteDto> PopularRoutes { get; set; } = new();
    // Summary for pie / bar
    public Dictionary<string, int> RidesByStatus { get; set; } = new();
    public Dictionary<string, int> PaymentsByMethod { get; set; } = new();
    public Dictionary<string, int> PaymentsByStatus { get; set; } = new();
}
