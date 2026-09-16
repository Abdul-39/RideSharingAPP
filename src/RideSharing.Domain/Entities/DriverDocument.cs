using RideSharing.Domain.Common;
using RideSharing.Domain.Enums;
using System.Xml.Linq;

namespace RideSharing.Domain.Entities;

/// <summary>
/// Stored document metadata. File lives under secure uploads; path is never exposed to other users.
/// </summary>
public class DriverDocument : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public DocumentType DocumentType { get; set; }
    public string FileName { get; set; } = string.Empty;
    /// <summary>Relative path under private storage — not returned to non-owners.</summary>
    public string StoragePath { get; set; } = string.Empty;
    public string ContentType { get; set; } = "application/octet-stream";
    public long FileSizeBytes { get; set; }
    public VerificationRequestStatus Status { get; set; } = VerificationRequestStatus.Pending;
    public string? AdminNote { get; set; }
    public Guid? VerificationRequestId { get; set; }
    public VerificationRequest? VerificationRequest { get; set; }
}
