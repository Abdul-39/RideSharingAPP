namespace RideSharing.Application.DTOs.Realtime;

public class RideStatusChangedEvent
{
    public Guid RideId { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? PreviousStatus { get; set; }
    public string Message { get; set; } = string.Empty;
    public Guid? ChangedByUserId { get; set; }
    public DateTime At { get; set; } = DateTime.UtcNow;
}

public class RideLocationEvent
{
    public Guid RideId { get; set; }
    public Guid UserId { get; set; }
    public string Role { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public double? AccuracyMeters { get; set; }
    public DateTime At { get; set; } = DateTime.UtcNow;
}

public class RideNotificationEvent
{
    public Guid RideId { get; set; }
    public string Type { get; set; } = "info";
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime At { get; set; } = DateTime.UtcNow;
}
