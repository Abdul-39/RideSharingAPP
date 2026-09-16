using RideSharing.Application.DTOs.Rides;
using RideSharing.Domain.Entities;

namespace RideSharing.Application.Interfaces;

/// <summary>
/// Core matching engine — ranked matches, not random.
/// Designed so the algorithm can be improved without rewriting ride flow.
/// </summary>
public interface IMatchingService
{
    /// <summary>
    /// Find and persist ranked matches for a ride request.
    /// </summary>
    Task<IReadOnlyList<MatchResultDto>> FindMatchesAsync(RideRequest request, CancellationToken ct = default);

    /// <summary>
    /// Pure scoring helper (also used by unit tests).
    /// </summary>
    MatchScoreResult CalculateScore(
        Route requestRoute,
        TimeOnly requestTime,
        int toleranceMinutes,
        int seatsNeeded,
        GenderPreferenceRequest preference,
        CandidateDriver candidate);
}

public record GenderPreferenceRequest(Domain.Enums.GenderPreference Preference, Domain.Enums.Gender RequesterGender);

public class CandidateDriver
{
    public User User { get; set; } = null!;
    public Route Route { get; set; } = null!;
    public Vehicle? Vehicle { get; set; }
    public DriverProfile? DriverProfile { get; set; }
    public bool IsDriver { get; set; }
}

public class MatchScoreResult
{
    public bool IsEligible { get; set; }
    public decimal TotalScore { get; set; }
    public decimal SourceProximityScore { get; set; }
    public decimal DestinationProximityScore { get; set; }
    public decimal RouteSimilarityScore { get; set; }
    public decimal TimeCompatibilityScore { get; set; }
    public decimal VerificationScore { get; set; }
    public decimal PreferenceScore { get; set; }
    public string? RejectionReason { get; set; }

    public string Breakdown =>
        $"Source:{SourceProximityScore:F1} Dest:{DestinationProximityScore:F1} Route:{RouteSimilarityScore:F1} " +
        $"Time:{TimeCompatibilityScore:F1} Verified:{VerificationScore:F1} Pref:{PreferenceScore:F1}";
}
