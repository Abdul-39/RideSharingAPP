using RideSharing.Domain.Enums;

namespace RideSharing.Application.DTOs.Verification;

public class SubmitVerificationRequest
{
    public string? StudentOrEmployeeId { get; set; }
    public Guid? InstitutionId { get; set; }
    /// <summary>Full CNIC — accepted once, never returned in responses.</summary>
    public string? Cnic { get; set; }
    public string? ApplicantNote { get; set; }
}

public class VerificationRequestDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string UserName { get; set; } = "";
    public string Email { get; set; } = "";
    public string Status { get; set; } = "";
    public string? StudentOrEmployeeId { get; set; }
    public Guid? InstitutionId { get; set; }
    public string? InstitutionName { get; set; }
    public string? CnicLast4 { get; set; }
    public bool HasCnicOnFile { get; set; }
    public string? ApplicantNote { get; set; }
    public string? AdminNote { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public List<DocumentMetaDto> Documents { get; set; } = new();
}

public class DocumentMetaDto
{
    public Guid Id { get; set; }
    public string DocumentType { get; set; } = "";
    public string FileName { get; set; } = "";
    public string Status { get; set; } = "";
    public long FileSizeBytes { get; set; }
    public DateTime CreatedAt { get; set; }
    /// <summary>Only set when caller is owner or admin — download endpoint id.</summary>
    public bool CanDownload { get; set; }
}

public class AdminReviewRequest
{
    public string Decision { get; set; } = "Approved"; // Approved | Rejected | RequiresChanges
    public string? AdminNote { get; set; }
}

public class MyVerificationStatusDto
{
    public bool IsVerified { get; set; }
    public string? CnicLast4 { get; set; }
    public string? StudentOrEmployeeId { get; set; }
    public Guid? InstitutionId { get; set; }
    public string? InstitutionName { get; set; }
    public VerificationRequestDto? LatestRequest { get; set; }
}

public class InstitutionListItemDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string Type { get; set; } = "";
}
