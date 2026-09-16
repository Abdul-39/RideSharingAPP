namespace RideSharing.Application.Options;

public class MatchingOptions
{
    public const string SectionName = "Matching";
    public double RouteCorridorRadiusKm { get; set; } = 3.0;
    public int TimeToleranceMinutes { get; set; } = 15;
    public double MaxDestinationDistanceKm { get; set; } = 8.0;
    public double MaxDetourKm { get; set; } = 5.0;
    public bool RequireVerifiedForWomenOnly { get; set; } = false;
    public double WeightCorridorProximity { get; set; } = 30;
    public double WeightDestination { get; set; } = 25;
    public double WeightTime { get; set; } = 20;
    public double WeightVerification { get; set; } = 10;
    public double WeightCapacity { get; set; } = 10;
    public double WeightPreference { get; set; } = 5;
}
