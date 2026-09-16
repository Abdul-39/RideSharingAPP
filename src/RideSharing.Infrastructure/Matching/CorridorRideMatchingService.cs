using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RideSharing.Application.DTOs.Geo;
using RideSharing.Application.DTOs.Rides;
using RideSharing.Application.Interfaces;
using RideSharing.Application.Options;
using RideSharing.Domain.Entities;
using RideSharing.Domain.Enums;
using RideSharing.Infrastructure.Geo;
using RideSharing.Persistence.Context;

namespace RideSharing.Infrastructure.Matching;

/// <summary>
/// Corridor matching. Uses string status compare so it builds even if
/// RideMatchStatus enum is named differently in your project.
/// </summary>
public class CorridorRideMatchingService : IRideMatchingService
{
    private readonly RideSharingDbContext _db;
    private readonly IRoutingService _routing;
    private readonly MatchingOptions _opt;
    private readonly ILogger<CorridorRideMatchingService> _log;

    public CorridorRideMatchingService(
        RideSharingDbContext db,
        IRoutingService routing,
        IOptions<MatchingOptions> opt,
        ILogger<CorridorRideMatchingService> log)
    {
        _db = db;
        _routing = routing;
        _opt = opt.Value;
        _log = log;
    }

    public async Task<IReadOnlyList<CorridorMatchDto>> FindMatchesAsync(
        RideRequest request,
        CancellationToken ct = default)
    {
        await _db.Entry(request).Reference(r => r.Route).LoadAsync(ct);
        await _db.Entry(request).Reference(r => r.User).LoadAsync(ct);

        var pr = request.Route ?? throw new InvalidOperationException("Ride request has no route.");
        var pickup = new GeoPoint((double)pr.SourceLatitude, (double)pr.SourceLongitude);
        var dropoff = new GeoPoint((double)pr.DestinationLatitude, (double)pr.DestinationLongitude);
        var tolerance = request.TimeToleranceMinutes > 0
            ? request.TimeToleranceMinutes
            : _opt.TimeToleranceMinutes;

        var candidates = await _db.Routes.AsNoTracking()
            .Include(r => r.User)
            .Include(r => r.RideSchedules)
            .Where(r => r.IsActive && r.UserId != request.UserId && r.User.IsActive)
            .ToListAsync(ct);

        var ids = candidates.Select(c => c.UserId).Distinct().ToList();

        var vehicles = await _db.Vehicles.AsNoTracking()
            .Where(v => ids.Contains(v.DriverId) && v.IsActive)
            .ToListAsync(ct);

        var profiles = await _db.DriverProfiles.AsNoTracking()
            .Where(p => ids.Contains(p.UserId))
            .ToListAsync(ct);

        // Count accepted matches without hard-coding enum type name
        var acceptedMatches = await _db.RideMatches.AsNoTracking()
            .Where(m => ids.Contains(m.MatchedUserId))
            .ToListAsync(ct);

        var reservedByDriver = acceptedMatches
            .Where(m => string.Equals(m.Status.ToString(), "Accepted", StringComparison.OrdinalIgnoreCase))
            .GroupBy(m => m.MatchedUserId)
            .ToDictionary(g => g.Key, g => g.Count());

        var day = request.TravelDate.DayOfWeek;
        var results = new List<CorridorMatchDto>();

        foreach (var dr in candidates)
        {
            if (dr.RideSchedules.Count > 0 && !dr.RideSchedules.Any(s => MatchesDay(s, day)))
                continue;

            var profile = profiles.FirstOrDefault(p => p.UserId == dr.UserId);
            if (profile != null && !profile.IsAvailable)
                continue;

            var driverPref = GenderPreference.Any;
            try
            {
                var prop = profile?.GetType().GetProperty("WomenOnlyPreference")
                           ?? profile?.GetType().GetProperty("GenderPreference");
                if (prop != null)
                {
                    var val = prop.GetValue(profile);
                    if (val is bool b && b) driverPref = GenderPreference.FemaleOnly;
                    else if (val is GenderPreference gp) driverPref = gp;
                }
            }
            catch { /* ignore */ }

            if (!GenderMatchingRules.IsEligible(
                    dr.User.Gender, driverPref, request.User.Gender, request.GenderPreference))
                continue;

            if (_opt.RequireVerifiedForWomenOnly
                && (GenderMatchingRules.IsWomenOnly(driverPref)
                    || GenderMatchingRules.IsWomenOnly(request.GenderPreference))
                && !dr.User.IsVerified)
                continue;

            var vehicle = vehicles
                .Where(v => v.DriverId == dr.UserId)
                .OrderByDescending(v => v.SeatingCapacity)
                .FirstOrDefault();

            var capacity = vehicle?.SeatingCapacity ?? 1;
            reservedByDriver.TryGetValue(dr.UserId, out var reserved);
            var available = Math.Max(0, capacity - reserved);
            if (available < request.SeatsNeeded)
                continue;

            var timeDiff = Math.Abs(
                (dr.PreferredDepartureTime.ToTimeSpan() - request.PreferredDepartureTime.ToTimeSpan()).TotalMinutes);
            if (timeDiff > 12 * 60) timeDiff = 24 * 60 - timeDiff;
            if (timeDiff > tolerance)
                continue;

            var geometry = await _routing.GetRouteAsync(
                (double)dr.SourceLatitude, (double)dr.SourceLongitude,
                (double)dr.DestinationLatitude, (double)dr.DestinationLongitude, ct);

            var distFromRoute = GeoMath.DistancePointToPolylineKm(pickup, geometry.Points);
            if (distFromRoute > _opt.RouteCorridorRadiusKm)
                continue;

            var destDist = GeoMath.HaversineKm(
                dropoff.Latitude, dropoff.Longitude,
                (double)dr.DestinationLatitude, (double)dr.DestinationLongitude);
            var destOnRoute = GeoMath.DistancePointToPolylineKm(dropoff, geometry.Points);
            if (destDist > _opt.MaxDestinationDistanceKm && destOnRoute > _opt.RouteCorridorRadiusKm)
                continue;

            var womenOnly = GenderMatchingRules.IsWomenOnly(driverPref)
                            || GenderMatchingRules.IsWomenOnly(request.GenderPreference);

            var reasons = new List<string>
            {
                $"Pickup within {_opt.RouteCorridorRadiusKm} km of driver route ({distFromRoute:F1} km)",
                $"Departure within ±{tolerance} min ({timeDiff:F0} min)",
                destDist <= _opt.MaxDestinationDistanceKm
                    ? $"Destination compatible ({destDist:F1} km from driver destination)"
                    : $"Destination along corridor ({destOnRoute:F1} km)",
                $"Seats available ({available} ≥ {request.SeatsNeeded})"
            };
            if (womenOnly) reasons.Add("Women-only preference satisfied");
            if (dr.User.IsVerified) reasons.Add("Verification requirements satisfied");

            var score =
                _opt.WeightCorridorProximity * (1.0 - distFromRoute / _opt.RouteCorridorRadiusKm) +
                _opt.WeightDestination * (1.0 - Math.Min(destDist, _opt.MaxDestinationDistanceKm) / _opt.MaxDestinationDistanceKm) +
                _opt.WeightTime * (1.0 - timeDiff / Math.Max(1, tolerance)) +
                (dr.User.IsVerified ? _opt.WeightVerification : 0) +
                _opt.WeightCapacity * Math.Min(1.0, available / (double)Math.Max(1, request.SeatsNeeded)) +
                _opt.WeightPreference;

            // Create match — Status set via parse so enum name can vary
            var match = new RideMatch
            {
                Id = Guid.NewGuid(),
                RideRequestId = request.Id,
                MatchedUserId = dr.UserId,
                MatchScore = (decimal)Math.Round(score, 2),
                CreatedAt = DateTime.UtcNow
            };

            // Set Status without compile-time dependency on exact enum name
            SetMatchPending(match);

            _db.RideMatches.Add(match);

            results.Add(new CorridorMatchDto
            {
                MatchId = match.Id,
                RideRequestId = request.Id,
                MatchedUserId = dr.UserId,
                DriverName = $"{dr.User.FirstName} {dr.User.LastName}".Trim(),
                SourcePlaceName = dr.SourceAddress,
                DestinationPlaceName = dr.DestinationAddress,
                DistanceFromRouteKm = Math.Round(distFromRoute, 2),
                DestinationDistanceKm = Math.Round(destDist, 2),
                DepartureDifferenceMinutes = (int)Math.Round(timeDiff),
                AvailableSeats = available,
                RequestedSeats = request.SeatsNeeded,
                MatchScore = match.MatchScore,
                WomenOnly = womenOnly,
                IsVerified = dr.User.IsVerified,
                MatchReasons = reasons,
                VehicleInfo = vehicle != null ? $"{vehicle.Make} {vehicle.Model} ({vehicle.Color})" : null,
                Status = "Pending"
            });
        }

        await _db.SaveChangesAsync(ct);
        return results.OrderByDescending(r => r.MatchScore).ToList();
    }

    private static void SetMatchPending(RideMatch match)
    {
        var prop = typeof(RideMatch).GetProperty("Status");
        if (prop == null) return;
        var type = prop.PropertyType;
        if (type.IsEnum)
        {
            // Prefer Pending
            foreach (var name in new[] { "Pending", "Open", "Active" })
            {
                if (Enum.TryParse(type, name, true, out var val))
                {
                    prop.SetValue(match, val);
                    return;
                }
            }
            prop.SetValue(match, Enum.GetValues(type).GetValue(0));
        }
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
}
