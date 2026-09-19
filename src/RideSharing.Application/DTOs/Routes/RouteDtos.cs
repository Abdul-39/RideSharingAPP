namespace RideSharing.Application.DTOs.Routes;

public class ScheduleDto
{
  public Guid? Id { get; set; }

  public bool Monday { get; set; }
  public bool Tuesday { get; set; }
  public bool Wednesday { get; set; }
  public bool Thursday { get; set; }
  public bool Friday { get; set; }
  public bool Saturday { get; set; }
  public bool Sunday { get; set; }

  public bool IsActive { get; set; } = true;

  public DateOnly? EffectiveFrom { get; set; }
  public DateOnly? EffectiveTo { get; set; }

  public bool HasAnyDay =>
      Monday ||
      Tuesday ||
      Wednesday ||
      Thursday ||
      Friday ||
      Saturday ||
      Sunday;
}

public class RouteDto
{
  public Guid Id { get; set; }

  public Guid UserId { get; set; }

  public decimal SourceLatitude { get; set; }
  public decimal SourceLongitude { get; set; }
  public string SourceAddress { get; set; } = string.Empty;

  public decimal DestinationLatitude { get; set; }
  public decimal DestinationLongitude { get; set; }
  public string DestinationAddress { get; set; } = string.Empty;

  public string PreferredDepartureTime { get; set; } = string.Empty;

  public int MaximumTimeToleranceMinutes { get; set; }

  public bool IsActive { get; set; }

  // ============================================
  // DRIVER / PASSENGER
  // ============================================

  public bool IsDriverRoute { get; set; }

  // Automatically calculated from IsDriverRoute
  public string RouteType =>
      IsDriverRoute ? "Driver" : "Passenger";

  public int AvailableSeats { get; set; }

  public DateTime CreatedAt { get; set; }

  public List<ScheduleDto> Schedules { get; set; } = new();
}

public class CreateRouteRequest
{
  public decimal SourceLatitude { get; set; }

  public decimal SourceLongitude { get; set; }

  public string SourceAddress { get; set; } = string.Empty;

  public decimal DestinationLatitude { get; set; }

  public decimal DestinationLongitude { get; set; }

  public string DestinationAddress { get; set; } = string.Empty;

  public string PreferredDepartureTime { get; set; } = string.Empty;

  public int MaximumTimeToleranceMinutes { get; set; } = 15;

  public bool IsActive { get; set; } = true;

  // ============================================
  // DRIVER / PASSENGER
  // ============================================

  public bool IsDriverRoute { get; set; }

  public string RouteType { get; set; } = "Passenger";

  public int AvailableSeats { get; set; } = 0;

  public List<ScheduleDto> Schedules { get; set; } = new();
}

public class UpdateRouteRequest
{
  public decimal SourceLatitude { get; set; }

  public decimal SourceLongitude { get; set; }

  public string SourceAddress { get; set; } = string.Empty;

  public decimal DestinationLatitude { get; set; }

  public decimal DestinationLongitude { get; set; }

  public string DestinationAddress { get; set; } = string.Empty;

  public string PreferredDepartureTime { get; set; } = string.Empty;

  public int MaximumTimeToleranceMinutes { get; set; } = 15;

  public bool IsActive { get; set; } = true;

  // ============================================
  // DRIVER / PASSENGER
  // ============================================

  public bool IsDriverRoute { get; set; }

  public string RouteType { get; set; } = "Passenger";

  public int AvailableSeats { get; set; } = 0;

  public List<ScheduleDto> Schedules { get; set; } = new();
}
