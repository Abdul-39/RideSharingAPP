namespace RideSharing.Application.Options;

/// <summary>
/// Full options set so CorridorRideMatchingService and older code both compile.
/// Bind from appsettings section "Matching".
/// </summary>
public class MatchingOptions
{
  public const string SectionName = "Matching";

  public double RouteCorridorRadiusKm { get; set; } = 3.0;
  public double MaxPickupDistanceKm { get; set; } = 3.0;
  public double MaxDropoffDistanceKm { get; set; } = 3.0;
  public double MaxDestinationDistanceKm { get; set; } = 8.0;
  public double MaxDetourKm { get; set; } = 5.0;
  public double MaxDetourPercentage { get; set; } = 25.0;
  public int TimeToleranceMinutes { get; set; } = 15;
  public bool RequireVerifiedForWomenOnly { get; set; } = false;

  /// <summary>Minimum direction cosine (-1..1). Opposite routes are below this.</summary>
  public double MinDirectionCosine { get; set; } = 0.15;

  // Score weights
  public double WeightCorridorProximity { get; set; } = 28;
  public double WeightDestination { get; set; } = 18;
  public double WeightDirection { get; set; } = 15;
  public double WeightTime { get; set; } = 15;
  public double WeightDetour { get; set; } = 12;
  public double WeightVerification { get; set; } = 7;
  public double WeightCapacity { get; set; } = 5;

  /// <summary>Used by older scoring paths (preference / headroom).</summary>
  public double WeightPreference { get; set; } = 5;
}
