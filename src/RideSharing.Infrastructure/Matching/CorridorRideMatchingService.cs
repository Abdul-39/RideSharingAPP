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

public class CorridorRideMatchingService : IRideMatchingService
{
  private readonly RideSharingDbContext _db;
  private readonly IRoutingService _routing;
  private readonly MatchingOptions _opt;
  private readonly ILogger<CorridorRideMatchingService> _log;

  // =============================================================
  // MODE 2 — NEARBY / RANDOM ROUTE SETTINGS
  // =============================================================

  // Driver source -> passenger pickup maximum distance
  private const double NearbySourceDistanceKm = 12.0;

  // Driver destination -> passenger dropoff maximum distance
  private const double NearbyDestinationDistanceKm = 12.0;

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
    // =========================================================
    // LOAD REQUEST ROUTE + USER
    // =========================================================

    await _db.Entry(request)
        .Reference(r => r.Route)
        .LoadAsync(ct);

    await _db.Entry(request)
        .Reference(r => r.User)
        .LoadAsync(ct);

    var pr = request.Route
        ?? throw new InvalidOperationException(
            "Ride request has no route.");

    var pickup = new GeoPoint(
        (double)pr.SourceLatitude,
        (double)pr.SourceLongitude);

    var dropoff = new GeoPoint(
        (double)pr.DestinationLatitude,
        (double)pr.DestinationLongitude);

    var tolerance =
        request.TimeToleranceMinutes > 0
            ? request.TimeToleranceMinutes
            : _opt.TimeToleranceMinutes;

    _log.LogInformation(
        "MATCHING: Request={RequestId}, User={UserId}, " +
        "Pickup={PickupLat},{PickupLon}, " +
        "Dropoff={DropoffLat},{DropoffLon}",
        request.Id,
        request.UserId,
        pickup.Latitude,
        pickup.Longitude,
        dropoff.Latitude,
        dropoff.Longitude);

    // =========================================================
    // GET ACTIVE DRIVER ROUTES
    // =========================================================

    var candidates = await _db.Routes
        .AsNoTracking()
        .Include(r => r.User)
        .Include(r => r.RideSchedules)
        .Where(r =>
            r.IsActive &&
            r.IsDriverRoute &&
            r.AvailableSeats > 0 &&
            r.UserId != request.UserId &&
            r.User.IsActive)
        .ToListAsync(ct);

    _log.LogInformation(
        "MATCHING: {CandidateCount} active driver routes found.",
        candidates.Count);

    // =========================================================
    // GET VEHICLES
    // =========================================================

    var driverIds =
        candidates
            .Select(c => c.UserId)
            .Distinct()
            .ToList();

    var vehicles = await _db.Vehicles
        .AsNoTracking()
        .Where(v =>
            driverIds.Contains(v.DriverId) &&
            v.IsActive)
        .ToListAsync(ct);

    // =========================================================
    // GET DRIVER PROFILES
    // =========================================================

    var profiles = await _db.DriverProfiles
        .AsNoTracking()
        .Where(p =>
            driverIds.Contains(p.UserId))
        .ToListAsync(ct);

    // =========================================================
    // EXISTING MATCHES FOR THIS REQUEST
    // =========================================================

    var existingMatches = await _db.RideMatches
        .AsNoTracking()
        .Where(m =>
            m.RideRequestId == request.Id &&
            !m.IsDeleted)
        .ToListAsync(ct);

    // =========================================================
    // EXISTING ACCEPTED MATCHES BY DRIVER
    //
    // We load these because seat reservation is now calculated
    // per DRIVER ROUTE rather than globally per driver.
    // =========================================================

    var acceptedMatches = await _db.RideMatches
        .AsNoTracking()
        .Where(m =>
            driverIds.Contains(m.MatchedUserId) &&
            !m.IsDeleted)
        .ToListAsync(ct);

    // =========================================================
    // ALREADY MATCHED DRIVERS FOR THIS REQUEST
    // =========================================================

    var alreadyMatchedDrivers =
        existingMatches
            .Where(m =>
                m.Status != MatchStatus.Rejected &&
                m.Status != MatchStatus.Expired)
            .Select(m => m.MatchedUserId)
            .ToHashSet();

    // =========================================================
    // MATCH EACH DRIVER ROUTE
    // =========================================================

    var day =
        request.TravelDate.DayOfWeek;

    var results =
        new List<CorridorMatchDto>();

    foreach (var driverRoute in candidates)
    {
      try
      {
        // =================================================
        // ALREADY MATCHED
        // =================================================

        if (alreadyMatchedDrivers.Contains(
                driverRoute.UserId))
        {
          _log.LogDebug(
              "MATCH REJECTED: Driver={DriverId} " +
              "already has an active match for Request={RequestId}",
              driverRoute.UserId,
              request.Id);

          continue;
        }

        // =================================================
        // SCHEDULE / DAY
        // =================================================

        if (driverRoute.RideSchedules.Count > 0 &&
            !driverRoute.RideSchedules.Any(
                s => MatchesDay(s, day)))
        {
          _log.LogInformation(
              "MATCH REJECTED: Driver={DriverId}, " +
              "schedule does not match {Day}",
              driverRoute.UserId,
              day);

          continue;
        }

        // =================================================
        // DRIVER AVAILABILITY
        // =================================================

        var profile =
            profiles.FirstOrDefault(
                p => p.UserId == driverRoute.UserId);

        if (profile != null &&
            !profile.IsAvailable)
        {
          _log.LogInformation(
              "MATCH REJECTED: Driver={DriverId} is unavailable.",
              driverRoute.UserId);

          continue;
        }

        // =================================================
        // GENDER PREFERENCE
        // =================================================

        var driverPref =
            GenderPreference.Any;

        try
        {
          var property =
              profile?.GetType()
                  .GetProperty("WomenOnlyPreference")
              ??
              profile?.GetType()
                  .GetProperty("GenderPreference");

          if (property != null)
          {
            var value =
                property.GetValue(profile);

            if (value is bool boolValue &&
                boolValue)
            {
              driverPref =
                  GenderPreference.FemaleOnly;
            }
            else if (value is GenderPreference genderPreference)
            {
              driverPref =
                  genderPreference;
            }
          }
        }
        catch
        {
          // Keep default Any preference.
        }

        if (!GenderMatchingRules.IsEligible(
                driverRoute.User.Gender,
                driverPref,
                request.User.Gender,
                request.GenderPreference))
        {
          _log.LogInformation(
              "MATCH REJECTED: Driver={DriverId}, " +
              "gender preference mismatch.",
              driverRoute.UserId);

          continue;
        }

        // =================================================
        // VERIFICATION
        // =================================================

        if (_opt.RequireVerifiedForWomenOnly &&
            (GenderMatchingRules.IsWomenOnly(driverPref) ||
             GenderMatchingRules.IsWomenOnly(
                 request.GenderPreference)) &&
            !driverRoute.User.IsVerified)
        {
          _log.LogInformation(
              "MATCH REJECTED: Driver={DriverId} " +
              "does not satisfy verification requirement.",
              driverRoute.UserId);

          continue;
        }

        // =================================================
        // VEHICLE
        //
        // Vehicle is used for display information only.
        // Route.AvailableSeats is the source of truth for
        // this published driver route.
        // =================================================

        var vehicle =
            vehicles
                .Where(v =>
                    v.DriverId == driverRoute.UserId)
                .OrderByDescending(
                    v => v.SeatingCapacity)
                .FirstOrDefault();

        // =================================================
        // ROUTE-SPECIFIC SEATS
        //
        // IMPORTANT:
        // Do NOT use:
        //
        // Vehicle Capacity - driver's global reservations
        //
        // because a driver may have multiple routes.
        //
        // Instead:
        //
        // Route.AvailableSeats
        //          -
        // Accepted matches on THIS route
        //
        // =================================================

        var routeCapacity =
            driverRoute.AvailableSeats;

        var reservedOnRoute =
            acceptedMatches.Count(m =>
                m.MatchedRouteId == driverRoute.Id &&
                string.Equals(
                    m.Status.ToString(),
                    "Accepted",
                    StringComparison.OrdinalIgnoreCase));

        var available =
            Math.Max(
                0,
                routeCapacity - reservedOnRoute);

        // =================================================
        // SEAT DEBUG
        // =================================================

        _log.LogInformation(
            "SEAT DEBUG: Driver={DriverId}, Route={RouteId}, " +
            "RouteCapacity={RouteCapacity}, Vehicle={VehicleId}, " +
            "VehicleCapacity={VehicleCapacity}, " +
            "ReservedOnRoute={Reserved}, " +
            "Available={Available}, Requested={Requested}",
            driverRoute.UserId,
            driverRoute.Id,
            routeCapacity,
            vehicle?.Id,
            vehicle?.SeatingCapacity,
            reservedOnRoute,
            available,
            request.SeatsNeeded);

        // =================================================
        // SEAT CHECK
        // =================================================

        if (available < request.SeatsNeeded)
        {
          _log.LogInformation(
              "MATCH REJECTED: Driver={DriverId}, Route={RouteId}, " +
              "available seats={Available}, requested={Requested}",
              driverRoute.UserId,
              driverRoute.Id,
              available,
              request.SeatsNeeded);

          continue;
        }

        // =================================================
        // TIME MATCHING
        // =================================================

        var timeDiff =
            Math.Abs(
                (
                    driverRoute.PreferredDepartureTime
                        .ToTimeSpan()
                    -
                    request.PreferredDepartureTime
                        .ToTimeSpan()
                ).TotalMinutes);

        // Handle crossing midnight.
        if (timeDiff > 12 * 60)
        {
          timeDiff =
              24 * 60 - timeDiff;
        }

        if (timeDiff > tolerance)
        {
          _log.LogInformation(
              "MATCH REJECTED: Driver={DriverId}, " +
              "time difference={TimeDifference} min, " +
              "tolerance={Tolerance} min",
              driverRoute.UserId,
              timeDiff,
              tolerance);

          continue;
        }

        // =================================================
        // DRIVER SOURCE / DESTINATION
        // =================================================

        var driverStart =
            new GeoPoint(
                (double)driverRoute.SourceLatitude,
                (double)driverRoute.SourceLongitude);

        var driverEnd =
            new GeoPoint(
                (double)driverRoute.DestinationLatitude,
                (double)driverRoute.DestinationLongitude);

        // =================================================
        // DIRECT DISTANCES FOR MODE 2
        // =================================================

        var sourceToPickupDistance =
            GeoMath.HaversineKm(
                driverStart.Latitude,
                driverStart.Longitude,
                pickup.Latitude,
                pickup.Longitude);

        var destinationToDropoffDistance =
            GeoMath.HaversineKm(
                driverEnd.Latitude,
                driverEnd.Longitude,
                dropoff.Latitude,
                dropoff.Longitude);

        // =================================================
        // MODE 2 — NEARBY / RANDOM ROUTE
        // =================================================

        var nearbyRouteMatch =
            sourceToPickupDistance <=
                NearbySourceDistanceKm &&
            destinationToDropoffDistance <=
                NearbyDestinationDistanceKm;

        _log.LogInformation(
            "MODE 2 CHECK: Driver={DriverId}, " +
            "SourceToPickup={SourceDistance:F2} km / {MaxSource:F2} km, " +
            "DestinationToDropoff={DestinationDistance:F2} km / {MaxDestination:F2} km, " +
            "NearbyMatch={NearbyMatch}",
            driverRoute.UserId,
            sourceToPickupDistance,
            NearbySourceDistanceKm,
            destinationToDropoffDistance,
            NearbyDestinationDistanceKm,
            nearbyRouteMatch);

        // =================================================
        // GET DRIVER ROUTE POLYLINE
        // =================================================

        IReadOnlyList<GeoPoint> pathPoints =
            RoutePolylineCodec.Deserialize(
                driverRoute.RoutePolylineJson);

        // If stored polyline is missing/invalid,
        // ask OSRM for road geometry.
        if (pathPoints.Count < 2)
        {
          _log.LogInformation(
              "MATCHING: Driver={DriverId} has no valid " +
              "stored polyline. Requesting OSRM route.",
              driverRoute.UserId);

          var geometry =
              await _routing.GetRouteAsync(
                  (double)driverRoute.SourceLatitude,
                  (double)driverRoute.SourceLongitude,
                  (double)driverRoute.DestinationLatitude,
                  (double)driverRoute.DestinationLongitude,
                  ct);

          pathPoints =
              geometry.Points;
        }

        // =================================================
        // VARIABLES USED BY BOTH MODES
        // =================================================

        double pickupDist =
            double.MaxValue;

        double dropoffDist =
            double.MaxValue;

        double pickupProgress =
            0;

        double dropoffProgress =
            0;

        double progressGap =
            0;

        double directionCosine =
            0;

        double detourKm =
            0;

        double detourPercent =
            0;

        bool corridorRouteMatch =
            false;

        // =================================================
        // MODE 1 — SAME / OVERLAPPING ROUTE
        // =================================================

        if (pathPoints.Count >= 2)
        {
          pickupDist =
              GeoMath.DistancePointToPolylineKm(
                  pickup,
                  pathPoints);

          dropoffDist =
              GeoMath.DistancePointToPolylineKm(
                  dropoff,
                  pathPoints);

          var dropoffNearDriverEnd =
              GeoMath.HaversineKm(
                  dropoff.Latitude,
                  dropoff.Longitude,
                  driverEnd.Latitude,
                  driverEnd.Longitude)
              <= _opt.MaxDestinationDistanceKm;

          var pickupInsideCorridor =
              pickupDist <=
              _opt.RouteCorridorRadiusKm;

          var dropoffInsideCorridor =
              dropoffDist <=
              _opt.RouteCorridorRadiusKm;

          var destinationCompatible =
              dropoffInsideCorridor ||
              dropoffNearDriverEnd;

          if (pickupInsideCorridor &&
              destinationCompatible)
          {
            pickupProgress =
                GeoMath.ProgressAlongRoute(
                    pickup,
                    pathPoints);

            dropoffProgress =
                GeoMath.ProgressAlongRoute(
                    dropoff,
                    pathPoints);

            progressGap =
                dropoffProgress -
                pickupProgress;

            if (progressGap > 0.01)
            {
              directionCosine =
                  GeoMath.DirectionCosine(
                      driverStart,
                      driverEnd,
                      pickup,
                      dropoff);

              if (directionCosine >= -0.25)
              {
                detourKm =
                    GeoMath.EstimateCorridorDetourKm(
                        driverStart,
                        driverEnd,
                        pickup,
                        dropoff,
                        pathPoints,
                        pickupProgress,
                        dropoffProgress);

                var baseKm =
                    Math.Max(
                        0.1,
                        pathPoints
                            .Zip(
                                pathPoints.Skip(1),
                                (a, b) =>
                                    GeoMath.HaversineKm(
                                        a.Latitude,
                                        a.Longitude,
                                        b.Latitude,
                                        b.Longitude))
                            .Sum());

                detourPercent =
                    100.0 *
                    detourKm /
                    baseKm;

                if (detourKm <=
                        _opt.MaxDetourKm &&
                    detourPercent <=
                        _opt.MaxDetourPercentage)
                {
                  corridorRouteMatch =
                      true;
                }
              }
            }
          }
        }

        // =================================================
        // FINAL MODE DECISION
        // =================================================

        var isNearbyMatch =
            !corridorRouteMatch &&
            nearbyRouteMatch;

        if (!corridorRouteMatch &&
            !isNearbyMatch)
        {
          _log.LogInformation(
              "MATCH REJECTED: Driver={DriverId}. " +
              "Neither corridor route nor nearby/random route criteria satisfied.",
              driverRoute.UserId);

          continue;
        }

        var matchingMode =
            corridorRouteMatch
                ? "CORRIDOR"
                : "NEARBY/RANDOM";

        _log.LogInformation(
            "MATCH ACCEPTED BY {MatchingMode}: Driver={DriverId}, " +
            "SourceToPickup={SourceDistance:F2} km, " +
            "DestinationToDropoff={DestinationDistance:F2} km",
            matchingMode,
            driverRoute.UserId,
            sourceToPickupDistance,
            destinationToDropoffDistance);

        // =================================================
        // DESTINATION DISTANCE
        // =================================================

        var destinationDistance =
            GeoMath.HaversineKm(
                dropoff.Latitude,
                dropoff.Longitude,
                (double)driverRoute.DestinationLatitude,
                (double)driverRoute.DestinationLongitude);

        // =================================================
        // WOMEN ONLY
        // =================================================

        var womenOnly =
            GenderMatchingRules.IsWomenOnly(
                driverPref)
            ||
            GenderMatchingRules.IsWomenOnly(
                request.GenderPreference);

        // =================================================
        // MATCH REASONS
        // =================================================

        var reasons =
            new List<string>();

        if (corridorRouteMatch)
        {
          reasons.Add(
              $"CORRIDOR MATCH: Pickup within {_opt.RouteCorridorRadiusKm} km of driver route ({pickupDist:F1} km)");

          reasons.Add(
              $"Drop-off within corridor ({dropoffDist:F1} km), route order {pickupProgress:P0} → {dropoffProgress:P0}");

          reasons.Add(
              $"Detour ~{detourKm:F1} km ({detourPercent:F1}%)");

          reasons.Add(
              $"Direction OK (cos {directionCosine:F2})");
        }
        else
        {
          reasons.Add(
              $"NEARBY/RANDOM MATCH: Driver source → passenger pickup ({sourceToPickupDistance:F1} km)");

          reasons.Add(
              $"Driver destination → passenger drop-off ({destinationToDropoffDistance:F1} km)");

          reasons.Add(
              $"Both endpoints within {NearbySourceDistanceKm:F0} km nearby-route limit");
        }

        reasons.Add(
            $"Departure within ±{tolerance} min ({timeDiff:F0} min)");

        reasons.Add(
            $"Seats available ({available} ≥ {request.SeatsNeeded})");

        if (womenOnly)
        {
          reasons.Add(
              "Women-only preference satisfied");
        }

        if (driverRoute.User.IsVerified)
        {
          reasons.Add(
              "Verification requirements satisfied");
        }

        // =================================================
        // SCORE
        // =================================================

        double score;

        if (corridorRouteMatch)
        {
          // Existing corridor scoring.
          var destinationDistanceForScore =
              Math.Min(
                  destinationDistance /
                  Math.Max(
                      0.01,
                      _opt.MaxDestinationDistanceKm),

                  dropoffDist /
                  Math.Max(
                      0.01,
                      _opt.RouteCorridorRadiusKm));

          score =
              _opt.WeightCorridorProximity *
              (
                  1.0 -
                  pickupDist /
                  Math.Max(
                      0.01,
                      _opt.RouteCorridorRadiusKm)
              )

              +

              _opt.WeightDestination *
              (
                  1.0 -
                  Math.Clamp(
                      destinationDistanceForScore,
                      0,
                      1)
              )

              +

              _opt.WeightTime *
              (
                  1.0 -
                  timeDiff /
                  Math.Max(
                      1,
                      tolerance)
              )

              +

              (driverRoute.User.IsVerified
                  ? _opt.WeightVerification
                  : 0)

              +

              _opt.WeightCapacity *
              Math.Min(
                  1.0,
                  available /
                  (double)Math.Max(
                      1,
                      request.SeatsNeeded))

              +

              _opt.WeightPreference;
        }
        else
        {
          // =================================================
          // MODE 2 SCORING
          // =================================================

          var sourceScore =
              1.0 -
              Math.Clamp(
                  sourceToPickupDistance /
                  NearbySourceDistanceKm,
                  0,
                  1);

          var destinationScore =
              1.0 -
              Math.Clamp(
                  destinationToDropoffDistance /
                  NearbyDestinationDistanceKm,
                  0,
                  1);

          var timeScore =
              1.0 -
              Math.Clamp(
                  timeDiff /
                  Math.Max(
                      1,
                      tolerance),
                  0,
                  1);

          var capacityScore =
              Math.Min(
                  1.0,
                  available /
                  (double)Math.Max(
                      1,
                      request.SeatsNeeded));

          var verificationScore =
              driverRoute.User.IsVerified
                  ? 1.0
                  : 0.0;

          // Nearby route score.
          score =
              0.30 * sourceScore +
              0.30 * destinationScore +
              0.20 * timeScore +
              0.10 * capacityScore +
              0.05 * verificationScore +
              0.05;
        }

        // Make sure score stays sensible.
        score =
            Math.Max(
                0,
                Math.Min(
                    1.0,
                    score));

        // =================================================
        // CREATE RIDE MATCH
        // =================================================

        var match =
            new RideMatch
            {
              Id =
                    Guid.NewGuid(),

              RideRequestId =
                    request.Id,

              MatchedUserId =
                    driverRoute.UserId,

              MatchScore =
                    (decimal)Math.Round(
                        score,
                        2),

              CreatedAt =
                    DateTime.UtcNow,

              MatchedRouteId =
                    driverRoute.Id,

              VehicleId =
                    vehicle?.Id,

              ScoreBreakdown =
                    string.Join(
                        " | ",
                        reasons)
            };

        SetMatchPending(match);

        _db.RideMatches.Add(match);

        // =================================================
        // DTO
        // =================================================

        results.Add(
            new CorridorMatchDto
            {
              MatchId =
                    match.Id,

              RideRequestId =
                    request.Id,

              MatchedUserId =
                    driverRoute.UserId,

              DriverName =
                    $"{driverRoute.User.FirstName} " +
                    $"{driverRoute.User.LastName}".Trim(),

              SourcePlaceName =
                    driverRoute.SourceAddress,

              DestinationPlaceName =
                    driverRoute.DestinationAddress,

              DistanceFromRouteKm =
                    Math.Round(
                        corridorRouteMatch
                            ? pickupDist
                            : sourceToPickupDistance,
                        2),

              DestinationDistanceKm =
                    Math.Round(
                        corridorRouteMatch
                            ? destinationDistance
                            : destinationToDropoffDistance,
                        2),

              DepartureDifferenceMinutes =
                    (int)Math.Round(
                        timeDiff),

              AvailableSeats =
                    available,

              RequestedSeats =
                    request.SeatsNeeded,

              MatchScore =
                    match.MatchScore,

              WomenOnly =
                    womenOnly,

              IsVerified =
                    driverRoute.User.IsVerified,

              MatchReasons =
                    reasons,

              VehicleInfo =
                    vehicle != null
                        ? $"{vehicle.Make} " +
                          $"{vehicle.Model} " +
                          $"({vehicle.Color})"
                        : null,

              Status =
                    "Pending"
            });

        _log.LogInformation(
            "MATCH FOUND: Mode={Mode}, Driver={DriverId}, " +
            "Request={RequestId}, Score={Score}, " +
            "SourceToPickup={SourceDistance:F2} km, " +
            "DestinationToDropoff={DestinationDistance:F2} km",
            matchingMode,
            driverRoute.UserId,
            request.Id,
            score,
            sourceToPickupDistance,
            destinationToDropoffDistance);
      }
      catch (Exception ex)
      {
        _log.LogError(
            ex,
            "MATCH DRIVER ERROR: Driver={DriverId}, Request={RequestId}",
            driverRoute.UserId,
            request.Id);
      }
    }

    // =========================================================
    // SAVE MATCHES
    // =========================================================

    await _db.SaveChangesAsync(ct);

    _log.LogInformation(
        "MATCHING COMPLETED: Request={RequestId}, " +
        "MatchesFound={MatchCount}",
        request.Id,
        results.Count);

    return results
        .OrderByDescending(
            r => r.MatchScore)
        .ToList();
  }

  // =============================================================
  // DRIVER -> PASSENGER MATCHING
  // =============================================================

  public Task<IReadOnlyList<CorridorMatchDto>>
      FindMatchingPassengersAsync(
          Guid driverUserId,
          Guid driverRouteId,
          DateOnly travelDate,
          TimeOnly departureTime,
          int availableSeats,
          CancellationToken ct = default)
  {
    // Passenger-side automatic matching currently uses
    // FindMatchesAsync().
    return Task.FromResult<
        IReadOnlyList<CorridorMatchDto>>(
            Array.Empty<CorridorMatchDto>());
  }

  // =============================================================
  // MATCH STATUS
  // =============================================================

  private static void SetMatchPending(
      RideMatch match)
  {
    var property =
        typeof(RideMatch)
            .GetProperty("Status");

    if (property == null)
      return;

    var type =
        property.PropertyType;

    if (!type.IsEnum)
      return;

    foreach (var name in new[]
             {
                     "Pending",
                     "Open",
                     "Active"
                 })
    {
      if (Enum.TryParse(
              type,
              name,
              true,
              out var value))
      {
        property.SetValue(
            match,
            value);

        return;
      }
    }

    property.SetValue(
        match,
        Enum.GetValues(type)
            .GetValue(0));
  }

  // =============================================================
  // DAY MATCHING
  // =============================================================

  private static bool MatchesDay(
      RideSchedule schedule,
      DayOfWeek day)
  {
    return day switch
    {
      DayOfWeek.Monday =>
          schedule.Monday,

      DayOfWeek.Tuesday =>
          schedule.Tuesday,

      DayOfWeek.Wednesday =>
          schedule.Wednesday,

      DayOfWeek.Thursday =>
          schedule.Thursday,

      DayOfWeek.Friday =>
          schedule.Friday,

      DayOfWeek.Saturday =>
          schedule.Saturday,

      DayOfWeek.Sunday =>
          schedule.Sunday,

      _ => false
    };
  }
}
