namespace RideSharing.Application.DTOs.Safety;

public class EmergencyContactDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string PhoneNumber { get; set; } = "";
    public string? Relationship { get; set; }
    public bool IsPrimary { get; set; }
}

public class UpsertEmergencyContactRequest
{
    public string Name { get; set; } = "";
    public string PhoneNumber { get; set; } = "";
    public string? Relationship { get; set; }
    public bool IsPrimary { get; set; }
}

public class TriggerSosRequest
{
    public Guid RideId { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? Note { get; set; }
}

public class EmergencyAlertDto
{
    public Guid Id { get; set; }
    public Guid RideId { get; set; }
    public Guid UserId { get; set; }
    public string UserName { get; set; } = "";
    public DateTime TriggeredAt { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? Note { get; set; }
    public bool IsResolved { get; set; }
}

public class SafetySettingsDto
{
    public bool WomenOnlyPreference { get; set; }
    public string Gender { get; set; } = "";
    public decimal? AverageRating { get; set; }
    public int RatingCount { get; set; }
    public bool IsFlaggedForReview { get; set; }
}

public class UpdateSafetySettingsRequest
{
    public bool WomenOnlyPreference { get; set; }
}

public class SosBroadcastEvent
{
    public Guid AlertId { get; set; }
    public Guid RideId { get; set; }
    public Guid UserId { get; set; }
    public string UserName { get; set; } = "";
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? Note { get; set; }
    public DateTime TriggeredAt { get; set; }
}
