using RideSharing.Application.DTOs.Rides;
using RideSharing.Application.Interfaces;
using RideSharing.Domain.Entities;

namespace RideSharing.Infrastructure.Matching;

/// <summary>
/// Makes /match use corridor polyline matching instead of old pin-to-pin MatchingService.
/// </summary>
public class CorridorMatchingAdapter : IMatchingService
{
  private readonly IRideMatchingService _corridor;

  public CorridorMatchingAdapter(IRideMatchingService corridor)
  {
    _corridor = corridor;
  }

  public async Task<IReadOnlyList<MatchResultDto>> FindMatchesAsync(
      RideRequest request,
      CancellationToken ct = default)
  {
    var list = await _corridor.FindMatchesAsync(request, ct);

    return list.Select(c => new MatchResultDto
    {
      MatchId = c.MatchId,
      RideRequestId = c.RideRequestId,
      MatchedUserId = c.MatchedUserId,
      MatchedUserName = c.DriverName,
      IsVerified = c.IsVerified,
      VehicleInfo = c.VehicleInfo,
      SeatingCapacity = c.AvailableSeats,
      MatchedRouteSource = c.SourcePlaceName,
      MatchedRouteDestination = c.DestinationPlaceName,
      MatchScore = c.MatchScore,
      ScoreBreakdown = c.MatchReasons != null
            ? string.Join(" | ", c.MatchReasons)
            : null,
      Status = c.Status
    }).ToList();
  }

  public MatchScoreResult CalculateScore(
      Route requestRoute,
      TimeOnly requestTime,
      int toleranceMinutes,
      int seatsNeeded,
      GenderPreferenceRequest preference,
      CandidateDriver candidate)
  {
    // Not used by HTTP /match path when adapter is active
    return new MatchScoreResult { IsEligible = false, RejectionReason = "Use corridor engine" };
  }
}
