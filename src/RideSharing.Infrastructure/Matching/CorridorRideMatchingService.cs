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

  // Driver destination -> passenger drop-off maximum distance
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

  // =============================================================
  // MAIN MATCHING
  // =============================================================

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

    var passengerRoute = request.Route
        ?? throw new InvalidOperationException(
            "Ride request has no route.");

    var passengerUser = request.User
        ?? throw new InvalidOperationException(
            "Ride request has no user.");

    var pickup = new GeoPoint(
        (double)passengerRoute.SourceLatitude,
        (double)passengerRoute.SourceLongitude);

    var dropoff = new GeoPoint(
        (double)passengerRoute.DestinationLatitude,
        (double)passengerRoute.DestinationLongitude);

    // =========================================================
    // PASSENGER ROUTE ROAD DISTANCE
    //
    // Prefer the distance already calculated and stored when
    // the passenger route was created. If it is not available,
    // calculate the road route once using the routing service.
    // This is NOT Haversine/straight-line distance.
    // =========================================================

    var passengerRouteDistanceKm =
        passengerRoute.DistanceKm;

    if (!passengerRouteDistanceKm.HasValue ||
        passengerRouteDistanceKm.Value <= 0)
    {
      try
      {
        var passengerGeometry =
            await _routing.GetRouteAsync(
                (double)passengerRoute.SourceLatitude,
                (double)passengerRoute.SourceLongitude,
                (double)passengerRoute.DestinationLatitude,
                (double)passengerRoute.DestinationLongitude,
                ct);

        if (passengerGeometry.Points.Count >= 2)
        {
          passengerRouteDistanceKm =
              passengerGeometry.Points
                  .Zip(
                      passengerGeometry.Points.Skip(1),
                      (a, b) =>
                          GeoMath.HaversineKm(
                              a.Latitude,
                              a.Longitude,
                              b.Latitude,
                              b.Longitude))
                  .Sum();
        }
      }
      catch (Exception ex)
      {
        _log.LogWarning(
            ex,
            "PASSENGER ROUTE DISTANCE: Unable to calculate road distance " +
            "for Request={RequestId}, Route={RouteId}",
            request.Id,
            passengerRoute.Id);
      }
    }

    _log.LogInformation(
        "PASSENGER ROUTE DISTANCE CHECK: Request={RequestId}, Route={RouteId}, " +
        "PassengerRoute={PassengerSource} -> {PassengerDestination}, " +
        "RoadDistance={PassengerRouteDistance}",
        request.Id,
        passengerRoute.Id,
        passengerRoute.SourceAddress,
        passengerRoute.DestinationAddress,
        passengerRouteDistanceKm.HasValue
            ? $"{passengerRouteDistanceKm.Value:F2} km"
            : "N/A");

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
            r.User.IsActive &&
            !r.User.IsDeleted)
        .ToListAsync(ct);

    _log.LogInformation(
        "MATCHING: {CandidateCount} active driver routes found.",
        candidates.Count);

    // =========================================================
    // GET DRIVER IDS
    // =========================================================

    var driverIds = candidates
        .Select(c => c.UserId)
        .Distinct()
        .ToList();

    // =========================================================
    // GET VEHICLES
    // =========================================================

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
    // EXISTING ACCEPTED MATCHES
    //
    // Used for route-specific seat reservation.
    // =========================================================

    var acceptedMatches = await _db.RideMatches
        .AsNoTracking()
        .Where(m =>
            driverIds.Contains(m.MatchedUserId) &&
            !m.IsDeleted)
        .ToListAsync(ct);

    // =========================================================
    // ALREADY MATCHED DRIVERS
    //
    // If this driver already has an active match for this
    // passenger request, don't create another match.
    // =========================================================

    var alreadyMatchedDrivers =
        existingMatches
            .Where(m =>
                m.Status != MatchStatus.Rejected &&
                m.Status != MatchStatus.Expired)
            .Select(m => m.MatchedUserId)
            .ToHashSet();

    // =========================================================
    // IMPORTANT:
    //
    // One driver can have multiple saved recurring routes.
    //
    // Example:
    //
    // Driver
    //   Route A
    //   Route B
    //   Route C
    //
    // We evaluate ALL routes but save only the BEST route
    // for that driver.
    //
    // Priority:
    //
    // 1. CORRIDOR / SAME ROUTE
    // 2. NEARBY / RANDOM
    //
    // Inside the same mode:
    //
    // Higher score wins.
    // =========================================================

    var bestCandidateByDriver =
        new Dictionary<Guid, MatchingCandidate>();

    // =========================================================
    // TRAVEL DAY
    // =========================================================

    var travelDay =
        request.TravelDate.DayOfWeek;

    // =========================================================
    // EVALUATE EACH DRIVER ROUTE
    // =========================================================

    foreach (var driverRoute in candidates)
    {
      try
      {
        // =================================================
        // ALREADY MATCHED DRIVER
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
        // SCHEDULE / DAY / EFFECTIVE DATE
        // =================================================

        var activeSchedules =
            driverRoute.RideSchedules
                .Where(s =>
                    s.IsActive &&
                    !s.IsDeleted)
                .ToList();

        if (activeSchedules.Count > 0)
        {
          var scheduleMatches =
              activeSchedules.Any(
                  s => MatchesSchedule(
                      s,
                      request.TravelDate,
                      travelDay));

          if (!scheduleMatches)
          {
            _log.LogInformation(
                "MATCH REJECTED: Driver={DriverId}, " +
                "Route={RouteId}, schedule does not match " +
                "TravelDate={TravelDate}, Day={Day}",
                driverRoute.UserId,
                driverRoute.Id,
                request.TravelDate,
                travelDay);

            continue;
          }
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
            else if (
                value is GenderPreference genderPreference)
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
                passengerUser.Gender,
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
            (
                GenderMatchingRules.IsWomenOnly(driverPref) ||
                GenderMatchingRules.IsWomenOnly(
                    request.GenderPreference)
            ) &&
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
        // Vehicle is mainly used for display.
        // Route.AvailableSeats remains source of truth.
        // =================================================

        var vehicle =
            vehicles
                .Where(v =>
                    v.DriverId == driverRoute.UserId)
                .OrderByDescending(
                    v => v.SeatingCapacity)
                .FirstOrDefault();

        // =================================================
        // ROUTE-SPECIFIC SEAT CALCULATION
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

        // Handle midnight crossing.
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
        // ROUTE DETAILS DEBUG
        //
        // This log is intentionally added so the exact
        // Driver Source -> Driver Destination pair can be
        // checked manually in Google Maps.
        //
        // It also logs the passenger Source -> Destination
        // pair and all coordinates.
        // =================================================

        _log.LogInformation(
            "ROUTE DETAILS: Driver={DriverId}, Route={RouteId}, " +
            "DriverSource={DriverSource}, DriverDestination={DriverDestination}, " +
            "DriverSourceCoords={DriverSourceLat:F6},{DriverSourceLon:F6}, " +
            "DriverDestinationCoords={DriverDestinationLat:F6},{DriverDestinationLon:F6}, " +
            "PassengerSource={PassengerSource}, PassengerDestination={PassengerDestination}, " +
            "PassengerSourceCoords={PassengerSourceLat:F6},{PassengerSourceLon:F6}, " +
            "PassengerDestinationCoords={PassengerDestinationLat:F6},{PassengerDestinationLon:F6}",
            driverRoute.UserId,
            driverRoute.Id,
            driverRoute.SourceAddress,
            driverRoute.DestinationAddress,
            driverStart.Latitude,
            driverStart.Longitude,
            driverEnd.Latitude,
            driverEnd.Longitude,
            passengerRoute.SourceAddress,
            passengerRoute.DestinationAddress,
            pickup.Latitude,
            pickup.Longitude,
            dropoff.Latitude,
            dropoff.Longitude);

        // =================================================
        // MODE 2 DIRECT DISTANCES
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
        // MODE 2 — NEARBY / RANDOM
        // =================================================

        var nearbyRouteMatch =
            sourceToPickupDistance <=
                NearbySourceDistanceKm
            &&
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

        // If no valid stored polyline exists,
        // get road geometry from OSRM.
        if (pathPoints.Count < 2)
        {
          _log.LogInformation(
              "MATCHING: Driver={DriverId}, Route={RouteId} " +
              "has no valid stored polyline. Requesting OSRM route.",
              driverRoute.UserId,
              driverRoute.Id);

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
        // DRIVER ROUTE ROAD DISTANCE DEBUG
        //
        // This is the distance along the route polyline,
        // not the straight-line Haversine distance.
        //
        // This is the value that should be compared with
        // Google Maps driving distance.
        // =================================================

        var driverRouteDistanceKm =
            pathPoints.Count >= 2
                ? pathPoints
                    .Zip(
                        pathPoints.Skip(1),
                        (a, b) =>
                            GeoMath.HaversineKm(
                                a.Latitude,
                                a.Longitude,
                                b.Latitude,
                                b.Longitude))
                    .Sum()
                : 0.0;

        _log.LogInformation(
            "ROUTE DISTANCE CHECK: Driver={DriverId}, Route={RouteId}, " +
            "DriverRoute={DriverSource} -> {DriverDestination}, " +
            "DriverRoadDistance={DriverRouteDistance:F2} km, " +
            "PassengerRoute={PassengerSource} -> {PassengerDestination}, " +
            "PassengerRoadDistance={PassengerRouteDistance}",
            driverRoute.UserId,
            driverRoute.Id,
            driverRoute.SourceAddress,
            driverRoute.DestinationAddress,
            driverRouteDistanceKm,
            passengerRoute.SourceAddress,
            passengerRoute.DestinationAddress,
            passengerRouteDistanceKm.HasValue
                ? $"{passengerRouteDistanceKm.Value:F2} km"
                : "N/A");

        _log.LogInformation(
            "ROUTE COORDINATES CHECK: Driver={DriverId}, Route={RouteId}, " +
            "DriverStart={DriverStartLat:F6},{DriverStartLon:F6}, " +
            "DriverEnd={DriverEndLat:F6},{DriverEndLon:F6}, " +
            "PassengerStart={PassengerStartLat:F6},{PassengerStartLon:F6}, " +
            "PassengerEnd={PassengerEndLat:F6},{PassengerEndLon:F6}",
            driverRoute.UserId,
            driverRoute.Id,
            driverStart.Latitude,
            driverStart.Longitude,
            driverEnd.Latitude,
            driverEnd.Longitude,
            pickup.Latitude,
            pickup.Longitude,
            dropoff.Latitude,
            dropoff.Longitude);

        _log.LogInformation(
            "ROAD DISTANCE COMPARISON: Driver={DriverId}, Route={RouteId}, " +
            "DriverRoadDistance={DriverRoadDistance:F2} km, " +
            "PassengerRoadDistance={PassengerRoadDistance}",
            driverRoute.UserId,
            driverRoute.Id,
            driverRouteDistanceKm,
            passengerRouteDistanceKm.HasValue
                ? $"{passengerRouteDistanceKm.Value:F2} km"
                : "N/A");

        // =================================================
        // MODE 1 VARIABLES
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
        // MODE 1 — CORRIDOR / SAME ROUTE
        //
        // This mode ALWAYS has priority over Mode 2.
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

          // Passenger destination is close to driver's
          // final destination.
          var dropoffNearDriverEnd =
              GeoMath.HaversineKm(
                  dropoff.Latitude,
                  dropoff.Longitude,
                  driverEnd.Latitude,
                  driverEnd.Longitude)
              <= _opt.MaxDestinationDistanceKm;

          // Passenger pickup is close to driver's route.
          var pickupInsideCorridor =
              pickupDist <=
              _opt.RouteCorridorRadiusKm;

          // Passenger drop-off is also close to route.
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

            // Passenger pickup must occur before
            // passenger drop-off along driver's route.
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
                        _opt.MaxDetourKm
                    &&
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
        //
        // IMPORTANT:
        //
        // If corridor matches, it wins.
        //
        // Nearby is used only when corridor does not match.
        // =================================================

        var isNearbyMatch =
            !corridorRouteMatch &&
            nearbyRouteMatch;

        if (!corridorRouteMatch &&
            !isNearbyMatch)
        {
          _log.LogInformation(
              "MATCH REJECTED: Driver={DriverId}, Route={RouteId}. " +
              "Neither corridor route nor nearby/random route criteria satisfied.",
              driverRoute.UserId,
              driverRoute.Id);

          continue;
        }

        var matchingMode =
            corridorRouteMatch
                ? "CORRIDOR"
                : "NEARBY/RANDOM";

        _log.LogInformation(
            "MATCH ACCEPTED BY {MatchingMode}: " +
            "Driver={DriverId}, Route={RouteId}, " +
            "SourceToPickup={SourceDistance:F2} km, " +
            "DestinationToDropoff={DestinationDistance:F2} km",
            matchingMode,
            driverRoute.UserId,
            driverRoute.Id,
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
              $"MODE 1 - CORRIDOR/SAME ROUTE MATCH");

          reasons.Add(
              $"Pickup within {_opt.RouteCorridorRadiusKm} km of driver route ({pickupDist:F1} km)");

          reasons.Add(
              $"Drop-off within corridor ({dropoffDist:F1} km), " +
              $"route order {pickupProgress:P0} → {dropoffProgress:P0}");

          reasons.Add(
              $"Detour ~{detourKm:F1} km ({detourPercent:F1}%)");

          reasons.Add(
              $"Direction OK (cos {directionCosine:F2})");
        }
        else
        {
          reasons.Add(
              $"MODE 2 - NEARBY/RANDOM MATCH");

          reasons.Add(
              $"Driver source → passenger pickup ({sourceToPickupDistance:F1} km)");

          reasons.Add(
              $"Driver destination → passenger drop-off ({destinationToDropoffDistance:F1} km)");

          reasons.Add(
              $"Both endpoints within " +
              $"{NearbySourceDistanceKm:F0} km nearby-route limit");
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
          // =================================================
          // MODE 1 SCORE
          // =================================================

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

              (
                  driverRoute.User.IsVerified
                      ? _opt.WeightVerification
                      : 0
              )

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
          // MODE 2 SCORE
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

          score =
              0.30 * sourceScore +
              0.30 * destinationScore +
              0.20 * timeScore +
              0.10 * capacityScore +
              0.05 * verificationScore +
              0.05;
        }

        // =================================================
        // KEEP SCORE BETWEEN 0 AND 1
        // =================================================

        score =
            Math.Max(
                0,
                Math.Min(
                    1.0,
                    score));

        // =================================================
        // BUILD CANDIDATE
        //
        // IMPORTANT:
        // We DO NOT save RideMatch here.
        //
        // We first compare all routes belonging to the
        // same driver.
        // =================================================

        var candidate =
            new MatchingCandidate
            {
              DriverRoute = driverRoute,

              Vehicle = vehicle,

              MatchingMode = matchingMode,

              IsCorridorMatch =
                    corridorRouteMatch,

              Score =
                    score,

              SourceToPickupDistance =
                    sourceToPickupDistance,

              DestinationToDropoffDistance =
                    destinationToDropoffDistance,

              DestinationDistance =
                    destinationDistance,

              PickupDistanceFromRoute =
                    pickupDist,

              DropoffDistanceFromRoute =
                    dropoffDist,

              PickupProgress =
                    pickupProgress,

              DropoffProgress =
                    dropoffProgress,

              DetourKm =
                    detourKm,

              DetourPercent =
                    detourPercent,

              DirectionCosine =
                    directionCosine,

              TimeDifferenceMinutes =
                    timeDiff,

              AvailableSeats =
                    available,

              WomenOnly =
                    womenOnly,

              IsVerified =
                    driverRoute.User.IsVerified,

              Reasons =
                    reasons
            };

        // =================================================
        // DRIVER BEST ROUTE SELECTION
        // =================================================

        if (!bestCandidateByDriver.TryGetValue(
                driverRoute.UserId,
                out var existingBest))
        {
          bestCandidateByDriver[
              driverRoute.UserId] =
              candidate;

          _log.LogInformation(
              "BEST MATCH CANDIDATE SELECTED: " +
              "Driver={DriverId}, Route={RouteId}, " +
              "Mode={Mode}, Score={Score:F2}",
              driverRoute.UserId,
              driverRoute.Id,
              matchingMode,
              score);
        }
        else if (IsBetterCandidate(
                     candidate,
                     existingBest))
        {
          bestCandidateByDriver[
              driverRoute.UserId] =
              candidate;

          _log.LogInformation(
              "BEST MATCH CANDIDATE REPLACED: " +
              "Driver={DriverId}, " +
              "OldRoute={OldRouteId}, " +
              "OldMode={OldMode}, " +
              "OldScore={OldScore:F2}, " +
              "NewRoute={NewRouteId}, " +
              "NewMode={NewMode}, " +
              "NewScore={NewScore:F2}",
              driverRoute.UserId,
              existingBest.DriverRoute.Id,
              existingBest.MatchingMode,
              existingBest.Score,
              driverRoute.Id,
              matchingMode,
              score);
        }
        else
        {
          _log.LogInformation(
              "MATCH CANDIDATE NOT SELECTED: " +
              "Driver={DriverId}, Route={RouteId}, " +
              "Mode={Mode}, Score={Score:F2}. " +
              "Existing best route remains {ExistingRouteId}.",
              driverRoute.UserId,
              driverRoute.Id,
              matchingMode,
              score,
              existingBest.DriverRoute.Id);
        }

        _log.LogInformation(
            "MATCH CANDIDATE FOUND: " +
            "Mode={Mode}, Driver={DriverId}, " +
            "Request={RequestId}, Route={RouteId}, " +
            "Score={Score}, " +
            "SourceToPickup={SourceDistance:F2} km, " +
            "DestinationToDropoff={DestinationDistance:F2} km",
            matchingMode,
            driverRoute.UserId,
            request.Id,
            driverRoute.Id,
            score,
            sourceToPickupDistance,
            destinationToDropoffDistance);
      }
      catch (Exception ex)
      {
        _log.LogError(
            ex,
            "MATCH DRIVER ERROR: Driver={DriverId}, " +
            "Route={RouteId}, Request={RequestId}",
            driverRoute.UserId,
            driverRoute.Id,
            request.Id);
      }
    }

    // =========================================================
    // CREATE ONLY FINAL BEST MATCH PER DRIVER
    // =========================================================

    var results =
        new List<CorridorMatchDto>();

    foreach (var candidate in bestCandidateByDriver.Values)
    {
      var driverRoute =
          candidate.DriverRoute;

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
                      candidate.Score,
                      2),

            CreatedAt =
                  DateTime.UtcNow,

            MatchedRouteId =
                  driverRoute.Id,

            VehicleId =
                  candidate.Vehicle?.Id,

            ScoreBreakdown =
                  string.Join(
                      " | ",
                      candidate.Reasons)
          };

      SetMatchPending(match);

      _db.RideMatches.Add(match);

      // =====================================================
      // FINAL MATCH DTO
      // =====================================================

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
                      candidate.IsCorridorMatch
                          ? candidate.PickupDistanceFromRoute
                          : candidate.SourceToPickupDistance,
                      2),

            DestinationDistanceKm =
                  Math.Round(
                      candidate.IsCorridorMatch
                          ? candidate.DestinationDistance
                          : candidate.DestinationToDropoffDistance,
                      2),

            DepartureDifferenceMinutes =
                  (int)Math.Round(
                      candidate.TimeDifferenceMinutes),

            AvailableSeats =
                  candidate.AvailableSeats,

            RequestedSeats =
                  request.SeatsNeeded,

            MatchScore =
                  match.MatchScore,

            WomenOnly =
                  candidate.WomenOnly,

            IsVerified =
                  candidate.IsVerified,

            MatchReasons =
                  candidate.Reasons,

            VehicleInfo =
                  candidate.Vehicle != null
                      ? $"{candidate.Vehicle.Make} " +
                        $"{candidate.Vehicle.Model} " +
                        $"({candidate.Vehicle.Color})"
                      : null,

            Status =
                  "Pending"
          });

      _log.LogInformation(
          "FINAL MATCH SELECTED: " +
          "Driver={DriverId}, Route={RouteId}, " +
          "Mode={Mode}, Score={Score:F2}",
          driverRoute.UserId,
          driverRoute.Id,
          candidate.MatchingMode,
          candidate.Score);
    }

    // =========================================================
    // SAVE ONLY FINAL MATCHES
    // =========================================================

    await _db.SaveChangesAsync(ct);

    _log.LogInformation(
        "MATCHING COMPLETED: Request={RequestId}, " +
        "DriverCandidates={DriverCandidates}, " +
        "FinalMatchesSaved={FinalMatches}",
        request.Id,
        bestCandidateByDriver.Count,
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
  // BEST CANDIDATE COMPARISON
  // =============================================================
  //
  // Priority:
  //
  // 1. CORRIDOR / SAME ROUTE
  // 2. NEARBY / RANDOM
  //
  // If both are same mode:
  // Higher score wins.
  //
  // This means:
  //
  // CORRIDOR 0.60
  // beats
  // NEARBY   0.90
  //
  // because same/overlapping route has priority.
  // =============================================================

  private static bool IsBetterCandidate(
      MatchingCandidate newCandidate,
      MatchingCandidate existingCandidate)
  {
    // Mode 1 always beats Mode 2.
    if (newCandidate.IsCorridorMatch &&
        !existingCandidate.IsCorridorMatch)
    {
      return true;
    }

    if (!newCandidate.IsCorridorMatch &&
        existingCandidate.IsCorridorMatch)
    {
      return false;
    }

    // Same mode -> higher score wins.
    if (newCandidate.Score >
        existingCandidate.Score)
    {
      return true;
    }

    if (newCandidate.Score <
        existingCandidate.Score)
    {
      return false;
    }

    // Final tie-breaker:
    // better source proximity wins.
    if (newCandidate.SourceToPickupDistance <
        existingCandidate.SourceToPickupDistance)
    {
      return true;
    }

    return false;
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
  // SCHEDULE MATCHING
  // =============================================================

  private static bool MatchesSchedule(
      RideSchedule schedule,
      DateOnly travelDate,
      DayOfWeek day)
  {
    // Schedule must be active.
    if (!schedule.IsActive ||
        schedule.IsDeleted)
    {
      return false;
    }

    // =========================================================
    // WEEKDAY
    // =========================================================

    var dayMatches =
        MatchesDay(
            schedule,
            day);

    if (!dayMatches)
    {
      return false;
    }

    // =========================================================
    // EFFECTIVE FROM
    // =========================================================

    if (schedule.EffectiveFrom.HasValue &&
        travelDate < schedule.EffectiveFrom.Value)
    {
      return false;
    }

    // =========================================================
    // EFFECTIVE TO
    // =========================================================

    if (schedule.EffectiveTo.HasValue &&
        travelDate > schedule.EffectiveTo.Value)
    {
      return false;
    }

    return true;
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

  // =============================================================
  // INTERNAL MATCHING CANDIDATE
  // =============================================================

  private sealed class MatchingCandidate
  {
    public Route DriverRoute { get; set; } = null!;

    public Vehicle? Vehicle { get; set; }

    public string MatchingMode { get; set; } = string.Empty;

    public bool IsCorridorMatch { get; set; }

    public double Score { get; set; }

    public double SourceToPickupDistance { get; set; }

    public double DestinationToDropoffDistance { get; set; }

    public double DestinationDistance { get; set; }

    public double PickupDistanceFromRoute { get; set; }

    public double DropoffDistanceFromRoute { get; set; }

    public double PickupProgress { get; set; }

    public double DropoffProgress { get; set; }

    public double DetourKm { get; set; }

    public double DetourPercent { get; set; }

    public double DirectionCosine { get; set; }

    public double TimeDifferenceMinutes { get; set; }

    public int AvailableSeats { get; set; }

    public bool WomenOnly { get; set; }

    public bool IsVerified { get; set; }

    public List<string> Reasons { get; set; } =
        new();
  }
}
