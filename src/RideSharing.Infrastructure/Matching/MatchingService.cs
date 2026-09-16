using Microsoft.EntityFrameworkCore;
using RideSharing.Application.DTOs.Rides;
using RideSharing.Application.Interfaces;
using RideSharing.Domain.Entities;
using RideSharing.Domain.Enums;
using RideSharing.Persistence.Context;

namespace RideSharing.Infrastructure.Matching;

/// <summary>
/// Ranked matching engine for daily repeat-route commuters.
/// Score weights can be tuned without changing the ride lifecycle.
/// </summary>
public class MatchingService : IMatchingService
{
    private readonly RideSharingDbContext _db;

    // Max distance (km) considered for proximity scoring
    private const double MaxSourceKm = 5.0;
    private const double MaxDestKm = 5.0;

    public MatchingService(RideSharingDbContext db) => _db = db;

    public async Task<IReadOnlyList<MatchResultDto>> FindMatchesAsync(RideRequest request, CancellationToken ct = default)
    {
        var route = request.Route ?? await _db.Routes.FirstAsync(r => r.Id == request.RouteId, ct);
        var requester = request.User ?? await _db.Users.FirstAsync(u => u.Id == request.UserId, ct);

        // Candidate drivers: active drivers with active routes & vehicles, not the requester
        var dayOfWeek = request.TravelDate.DayOfWeek;

        var candidateRoutes = await _db.Routes
            .Include(r => r.User)
            .Include(r => r.RideSchedules.Where(s => !s.IsDeleted && s.IsActive))
            .Where(r => r.IsActive && !r.IsDeleted && r.UserId != request.UserId && r.User.IsActive && !r.User.IsDeleted)
            .ToListAsync(ct);

        // Filter by schedule day
        candidateRoutes = candidateRoutes
            .Where(r => r.RideSchedules.Any(s => MatchesDay(s, dayOfWeek)))
            .ToList();

        var driverUserIds = candidateRoutes.Select(r => r.UserId).Distinct().ToList();

        var driverProfiles = await _db.DriverProfiles
            .Where(d => driverUserIds.Contains(d.UserId) && !d.IsDeleted && d.IsAvailable)
            .ToListAsync(ct);

        var vehicles = await _db.Vehicles
            .Include(v => v.VehicleType)
            .Where(v => driverUserIds.Contains(v.DriverId) && v.IsActive && !v.IsDeleted)
            .ToListAsync(ct);

        var driverRoles = await _db.UserRoles
            .Include(ur => ur.Role)
            .Where(ur => driverUserIds.Contains(ur.UserId) && ur.Role.Name == "Driver")
            .Select(ur => ur.UserId)
            .ToListAsync(ct);

        var effectivePref = request.GenderPreference;
        if (requester.WomenOnlyPreference)
            effectivePref = GenderPreference.WomenOnly;
        var preference = new GenderPreferenceRequest(effectivePref, requester.Gender);
        var results = new List<(MatchScoreResult score, CandidateDriver cand)>();

        foreach (var candRoute in candidateRoutes)
        {
            if (!driverRoles.Contains(candRoute.UserId))
                continue; // must be Driver

            var profile = driverProfiles.FirstOrDefault(p => p.UserId == candRoute.UserId);
            if (profile == null)
                continue; // not available / no driver profile

            var vehicle = vehicles
                .Where(v => v.DriverId == candRoute.UserId)
                .OrderByDescending(v => v.SeatingCapacity)
                .FirstOrDefault();

            var candidate = new CandidateDriver
            {
                User = candRoute.User,
                Route = candRoute,
                Vehicle = vehicle,
                DriverProfile = profile,
                IsDriver = true
            };

            var score = CalculateScore(
                route,
                request.PreferredDepartureTime,
                request.TimeToleranceMinutes,
                request.SeatsNeeded,
                preference,
                candidate);

            if (score.IsEligible)
                results.Add((score, candidate));
        }

        // Rank by score descending
        var ranked = results.OrderByDescending(x => x.score.TotalScore).ToList();

        // Remove previous matches for this request so unique (RideRequestId, MatchedUserId) allows re-run.
        // Soft-delete alone still occupies the unique index → SaveChanges fails with DbUpdateException.
        await _db.RideMatches
            .IgnoreQueryFilters()
            .Where(m => m.RideRequestId == request.Id && m.Status == MatchStatus.Pending)
            .ExecuteDeleteAsync(ct);

        var dtos = new List<MatchResultDto>();
        foreach (var (score, cand) in ranked)
        {
            var match = new RideMatch
            {
                Id = Guid.NewGuid(),
                RideRequestId = request.Id,
                MatchedUserId = cand.User.Id,
                VehicleId = cand.Vehicle?.Id,
                MatchedRouteId = cand.Route.Id,
                MatchScore = score.TotalScore,
                ScoreBreakdown = score.Breakdown is { Length: > 1000 }
                    ? score.Breakdown[..1000]
                    : score.Breakdown,
                Status = MatchStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };
            _db.RideMatches.Add(match);
            dtos.Add(ToDto(match, cand, score));
        }

        request.Status = ranked.Count > 0 ? RideRequestStatus.Matching : RideRequestStatus.Open;

        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex)
        {
            var inner = ex.InnerException?.Message ?? ex.Message;
            throw new InvalidOperationException($"Match save failed: {inner}", ex);
        }

        return dtos;
    }

    public MatchScoreResult CalculateScore(
        Route requestRoute,
        TimeOnly requestTime,
        int toleranceMinutes,
        int seatsNeeded,
        GenderPreferenceRequest preference,
        CandidateDriver candidate)
    {
        var result = new MatchScoreResult();

        // --- Hard filters ---
        if (candidate.Vehicle == null || candidate.Vehicle.SeatingCapacity < seatsNeeded)
        {
            result.RejectionReason = "Insufficient seats";
            return result;
        }

        if (candidate.DriverProfile != null && !candidate.DriverProfile.IsAvailable)
        {
            result.RejectionReason = "Driver not available";
            return result;
        }

        if (!candidate.User.IsActive)
        {
            result.RejectionReason = "User inactive";
            return result;
        }

                // Gender / women-only preference (hard filter)
        var reqWomenOnly = preference.Preference is GenderPreference.FemaleOnly or GenderPreference.WomenOnly;
        if (reqWomenOnly && candidate.User.Gender != Gender.Female)
        {
            result.RejectionReason = "Gender restriction";
            return result;
        }
        if (preference.Preference == GenderPreference.MaleOnly && candidate.User.Gender != Gender.Male)
        {
            result.RejectionReason = "Gender restriction";
            return result;
        }
        // Driver opted into women-only: only female passengers
        if (candidate.User.WomenOnlyPreference && preference.RequesterGender != Gender.Female)
        {
            result.RejectionReason = "Gender restriction";
            return result;
        }

        // Time window
        var timeDiffMinutes = Math.Abs((candidate.Route.PreferredDepartureTime.ToTimeSpan() - requestTime.ToTimeSpan()).TotalMinutes);
        var effectiveTolerance = Math.Max(toleranceMinutes, candidate.Route.MaximumTimeToleranceMinutes);
        if (timeDiffMinutes > effectiveTolerance)
        {
            result.RejectionReason = "Outside time tolerance";
            return result;
        }

        // Soft proximity gates (too far = ineligible)
        var sourceKm = HaversineKm(
            (double)requestRoute.SourceLatitude, (double)requestRoute.SourceLongitude,
            (double)candidate.Route.SourceLatitude, (double)candidate.Route.SourceLongitude);
        var destKm = HaversineKm(
            (double)requestRoute.DestinationLatitude, (double)requestRoute.DestinationLongitude,
            (double)candidate.Route.DestinationLatitude, (double)candidate.Route.DestinationLongitude);

        if (sourceKm > MaxSourceKm || destKm > MaxDestKm)
        {
            result.RejectionReason = "Route too far";
            return result;
        }

        // --- Scoring (0–100 scale components, weighted) ---
        // Source proximity: 25 pts
        result.SourceProximityScore = (decimal)(25.0 * (1.0 - sourceKm / MaxSourceKm));
        // Destination proximity: 25 pts
        result.DestinationProximityScore = (decimal)(25.0 * (1.0 - destKm / MaxDestKm));
        // Route similarity (avg of source+dest closeness): 20 pts
        result.RouteSimilarityScore = (result.SourceProximityScore + result.DestinationProximityScore) / 25m * 20m;
        // Time compatibility: 20 pts (closer time = higher)
        result.TimeCompatibilityScore = effectiveTolerance <= 0
            ? 20m
            : (decimal)(20.0 * (1.0 - timeDiffMinutes / effectiveTolerance));
        // Verification: 5 pts
        result.VerificationScore = candidate.User.IsVerified ? 5m : 0m;
        // Preference / capacity headroom: 5 pts
        result.PreferenceScore = candidate.Vehicle.SeatingCapacity >= seatsNeeded + 1 ? 5m : 3m;

        result.TotalScore =
            result.SourceProximityScore +
            result.DestinationProximityScore +
            result.RouteSimilarityScore +
            result.TimeCompatibilityScore +
            result.VerificationScore +
            result.PreferenceScore;

        result.IsEligible = true;
        return result;
    }

    private static bool MatchesDay(RideSchedule s, DayOfWeek day) => day switch
    {
        DayOfWeek.Monday => s.Monday,
        DayOfWeek.Tuesday => s.Tuesday,
        DayOfWeek.Wednesday => s.Wednesday,
        DayOfWeek.Thursday => s.Thursday,
        DayOfWeek.Friday => s.Friday,
        DayOfWeek.Saturday => s.Saturday,
        DayOfWeek.Sunday => s.Sunday,
        _ => false
    };

    /// <summary>Haversine distance in kilometers.</summary>
    public static double HaversineKm(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371.0;
        var dLat = DegreesToRadians(lat2 - lat1);
        var dLon = DegreesToRadians(lon2 - lon1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(DegreesToRadians(lat1)) * Math.Cos(DegreesToRadians(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return R * c;
    }

    private static double DegreesToRadians(double deg) => deg * Math.PI / 180.0;

    private static MatchResultDto ToDto(RideMatch match, CandidateDriver cand, MatchScoreResult score) => new()
    {
        MatchId = match.Id,
        RideRequestId = match.RideRequestId,
        MatchedUserId = cand.User.Id,
        MatchedUserName = $"{cand.User.FirstName} {cand.User.LastName[0]}.",
        IsVerified = cand.User.IsVerified,
        Gender = cand.User.Gender.ToString(),
        VehicleId = cand.Vehicle?.Id,
        VehicleInfo = cand.Vehicle != null
            ? $"{cand.Vehicle.Make} {cand.Vehicle.Model} ({cand.Vehicle.Color})"
            : null,
        SeatingCapacity = cand.Vehicle?.SeatingCapacity,
        MatchedRouteSource = cand.Route.SourceAddress,
        MatchedRouteDestination = cand.Route.DestinationAddress,
        MatchedDepartureTime = cand.Route.PreferredDepartureTime.ToString("HH:mm"),
        MatchScore = Math.Round(score.TotalScore, 2),
        ScoreBreakdown = score.Breakdown,
        Status = match.Status.ToString()
    };
}
