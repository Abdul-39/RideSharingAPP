using RideSharing.Domain.Common;
using RideSharing.Domain.Enums;

namespace RideSharing.Domain.Entities;

public class VerificationRequest : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public VerificationRequestStatus Status { get; set; } = VerificationRequestStatus.Pending;
    public string? StudentOrEmployeeId { get; set; }
    public Guid? InstitutionId { get; set; }
    public Institution? Institution { get; set; }

    /// <summary>Full CNIC stored server-side only; never mapped to public DTOs.</summary>
    public string? CnicEncryptedOrPlain { get; set; }
    /// <summary>Last 4 digits for owner/admin display only.</summary>
    public string? CnicLast4 { get; set; }

    public string? ApplicantNote { get; set; }
    public string? AdminNote { get; set; }
    public Guid? ReviewedByAdminId { get; set; }
    public DateTime? ReviewedAt { get; set; }

    public ICollection<DriverDocument> Documents { get; set; } = new List<DriverDocument>();
}
