using RideSharing.Domain.Common;
using RideSharing.Domain.Enums;

namespace RideSharing.Domain.Entities;

public class User : BaseEntity
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public Gender Gender { get; set; }
    public DateOnly? DateOfBirth { get; set; }
    public string? ProfileImageUrl { get; set; }
    public bool IsVerified { get; set; } = false;
    public bool IsActive { get; set; } = true;

    /// <summary>When true, matching only with women (Female gender).</summary>
    public bool WomenOnlyPreference { get; set; } = false;

    public decimal? AverageRating { get; set; }
    public int RatingCount { get; set; }
    public bool IsFlaggedForReview { get; set; }
    public string? FlagReason { get; set; }
    public DateTime? FlaggedAt { get; set; }

    // Institution (optional – for student/employee verification)
    public Guid? InstitutionId { get; set; }
    public Institution? Institution { get; set; }

    /// <summary>Campus/employee id number (not a password).</summary>
    public string? StudentOrEmployeeId { get; set; }

    /// <summary>Last 4 of CNIC for display; full CNIC only on verification requests.</summary>
    public string? CnicLast4 { get; set; }


    // Navigation
    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    public ICollection<Vehicle> Vehicles { get; set; } = new List<Vehicle>();
    public ICollection<Route> Routes { get; set; } = new List<Route>();
    public ICollection<RideSchedule> RideSchedules { get; set; } = new List<RideSchedule>();
}
