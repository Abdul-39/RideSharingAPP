namespace RideSharing.Application.DTOs.Drivers;

public class DriverProfileDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string? LicenseNumber { get; set; }
    public DateOnly? LicenseExpiryDate { get; set; }
    public int YearsOfExperience { get; set; }
    public string VerificationStatus { get; set; } = string.Empty;
    public bool IsAvailable { get; set; }
    public string? Notes { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
}

public class UpdateDriverProfileRequest
{
    public string? LicenseNumber { get; set; }
    public DateOnly? LicenseExpiryDate { get; set; }
    public int YearsOfExperience { get; set; }
    public bool IsAvailable { get; set; } = true;
    public string? Notes { get; set; }
}
