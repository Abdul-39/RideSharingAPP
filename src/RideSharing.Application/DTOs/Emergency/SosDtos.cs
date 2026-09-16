using RideSharing.Domain.Enums;

namespace RideSharing.Application.DTOs.Emergency;

public class ActivateSosRequest
{
    public Guid? RideId { get; set; }
    public EmergencyType Type { get; set; } = EmergencyType.General;
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? Notes { get; set; }
}

public class SosDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid? RideId { get; set; }
    public string Type { get; set; } = "";
    public string Status { get; set; } = "";
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? PlaceName { get; set; }
    public DateTime ActivatedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public string Message { get; set; } = "";
}

public class EmergencyContactDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string PhoneNumber { get; set; } = "";
    public string? Relationship { get; set; }
    public bool IsPrimary { get; set; }
}

public class CreateEmergencyContactRequest
{
    public string Name { get; set; } = "";
    public string PhoneNumber { get; set; } = "";
    public string? Relationship { get; set; }
    public bool IsPrimary { get; set; }
}
