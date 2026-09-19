using RideSharing.Domain.Common;

namespace RideSharing.Domain.Entities;

public class Route : BaseEntity
{
  public Guid UserId { get; set; }

  public User User { get; set; } = null!;

  public decimal SourceLatitude { get; set; }

  public decimal SourceLongitude { get; set; }

  public string SourceAddress { get; set; } = string.Empty;

  public decimal DestinationLatitude { get; set; }

  public decimal DestinationLongitude { get; set; }

  public string DestinationAddress { get; set; } = string.Empty;

  public TimeOnly PreferredDepartureTime { get; set; }

  public int MaximumTimeToleranceMinutes { get; set; } = 15;

  public bool IsActive { get; set; } = true;

  // ============================================
  // DRIVER / PASSENGER ROUTE
  // ============================================

  public bool IsDriverRoute { get; set; } = false;

  public int AvailableSeats { get; set; } = 0;

  // ============================================
  // ROUTING DATA
  // ============================================

  public string? RoutePolylineJson { get; set; }

  public double? DistanceKm { get; set; }

  public double? DurationMinutes { get; set; }

  public ICollection<RideSchedule> RideSchedules { get; set; }
      = new List<RideSchedule>();
}
