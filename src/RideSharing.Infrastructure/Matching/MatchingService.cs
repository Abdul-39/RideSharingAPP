using Microsoft.EntityFrameworkCore;
using RideSharing.Application.DTOs.Rides;
using RideSharing.Application.Interfaces;
using RideSharing.Domain.Entities;
using RideSharing.Domain.Enums;
using RideSharing.Persistence.Context;

namespace RideSharing.Infrastructure.Matching;

/// <summary>
/// Matching engine for recurring driver/passenger routes.
///
/// MODE 1:
/// Same / nearly same route.
/// Highest priority.
///
/// MODE 2:
/// Different but close routes.
/// Source and destination must both be within 12 km.
///
/// Recurring routes:
/// A saved Route can be reused on multiple days/weeks.
/// RideSchedule controls active days and date range.
///
/// CreatedAt is NOT used as a freshness condition.
/// An old saved route can continue matching as long as its
/// route and schedule are active.
/// </summary>
public class MatchingService : IMatchingService
{
  private readonly RideSharingDbContext _db;

  // ============================================================
  // MATCHING SETTINGS
  // ============================================================

  /// <summary>
  /// MODE 1:
  /// Source and destination are both within 1 km.
  ///
  /// This represents the same/nearly same route.
  /// </summary>
  private const double SameRouteThresholdKm = 1.0;

  /// <summary>
  /// MODE 2:
  /// Maximum distance between passenger and driver pickup.
  /// </summary>
  private const double MaxSourceKm = 12.0;

  /// <summary>
  /// MODE 2:
  /// Maximum distance between passenger and driver destination.
  /// </summary>
  private const double MaxDestinationKm = 12.0;

  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  public MatchingService(RideSharingDbContext db)
  {
    _db = db;
  }

  // ============================================================
  // FIND MATCHES
  // ============================================================

  public async Task<IReadOnlyList<MatchResultDto>> FindMatchesAsync(
      RideRequest request,
      CancellationToken ct = default)
  {
    // --------------------------------------------------------
    // LOAD REQUEST ROUTE
    // --------------------------------------------------------

    var requestRoute = request.Route;

    if (requestRoute == null)
    {
      requestRoute = await _db.Routes
          .Include(r => r.RideSchedules
              .Where(s =>
                  !s.IsDeleted &&
                  s.IsActive))
          .FirstOrDefaultAsync(
              r => r.Id == request.RouteId,
              ct);
    }

    if (requestRoute == null)
    {
      return Array.Empty<MatchResultDto>();
    }

    // --------------------------------------------------------
    // LOAD REQUESTER
    // --------------------------------------------------------

    var requester = request.User;

    if (requester == null)
    {
      requester = await _db.Users
          .FirstOrDefaultAsync(
              u => u.Id == request.UserId,
              ct);
    }

    if (requester == null)
    {
      return Array.Empty<MatchResultDto>();
    }

    // --------------------------------------------------------
    // TRAVEL DATE
    // --------------------------------------------------------

    var travelDate = request.TravelDate;

    var dayOfWeek = travelDate.DayOfWeek;

    // --------------------------------------------------------
    // LOAD DRIVER ROUTES
    //
    // IMPORTANT:
    // There is NO CreatedAt filter.
    //
    // Therefore an old saved route can continue to match.
    // --------------------------------------------------------

    var candidateRoutes = await _db.Routes
        .Include(r => r.User)
        .Include(r => r.RideSchedules
            .Where(s =>
                !s.IsDeleted &&
                s.IsActive))
        .Where(r =>
            r.IsActive &&
            r.IsDriverRoute &&
            !r.IsDeleted &&
            r.UserId != request.UserId &&
            r.User.IsActive &&
            !r.User.IsDeleted)
        .ToListAsync(ct);

    // --------------------------------------------------------
    // RECURRING SCHEDULE FILTER
    //
    // Candidate route must:
    //
    // 1. Be active
    // 2. Have an active schedule
    // 3. Have the requested weekday enabled
    // 4. Be >= EffectiveFrom if provided
    // 5. Be <= EffectiveTo if provided
    // --------------------------------------------------------

    candidateRoutes = candidateRoutes
        .Where(route =>
            route.RideSchedules.Any(schedule =>
                schedule.IsActive &&
                !schedule.IsDeleted &&
                MatchesDay(schedule, dayOfWeek) &&
                IsDateWithinSchedule(
                    schedule,
                    travelDate)))
        .ToList();

    // --------------------------------------------------------
    // DRIVER IDS
    // --------------------------------------------------------

    var driverUserIds = candidateRoutes
        .Select(r => r.UserId)
        .Distinct()
        .ToList();

    if (driverUserIds.Count == 0)
    {
      await ClearPendingMatchesAsync(
          request.Id,
          ct);

      request.Status =
          RideRequestStatus.Open;

      await _db.SaveChangesAsync(ct);

      return Array.Empty<MatchResultDto>();
    }

    // --------------------------------------------------------
    // DRIVER PROFILES
    // --------------------------------------------------------

    var driverProfiles = await _db.DriverProfiles
        .Where(d =>
            driverUserIds.Contains(d.UserId) &&
            !d.IsDeleted &&
            d.IsAvailable)
        .ToListAsync(ct);

    // --------------------------------------------------------
    // DRIVER VEHICLES
    // --------------------------------------------------------

    var vehicles = await _db.Vehicles
        .Include(v => v.VehicleType)
        .Where(v =>
            driverUserIds.Contains(v.DriverId) &&
            v.IsActive &&
            !v.IsDeleted)
        .ToListAsync(ct);

    // --------------------------------------------------------
    // DRIVER ROLES
    // --------------------------------------------------------

    var driverRoles = await _db.UserRoles
        .Include(ur => ur.Role)
        .Where(ur =>
            driverUserIds.Contains(ur.UserId) &&
            ur.Role.Name == "Driver")
        .Select(ur => ur.UserId)
        .Distinct()
        .ToListAsync(ct);

    // --------------------------------------------------------
    // GENDER PREFERENCE
    // --------------------------------------------------------

    var effectivePreference =
        request.GenderPreference;

    if (requester.WomenOnlyPreference)
    {
      effectivePreference =
          GenderPreference.WomenOnly;
    }

    var preference =
        new GenderPreferenceRequest(
            effectivePreference,
            requester.Gender);

    // --------------------------------------------------------
    // MATCH RESULTS
    // --------------------------------------------------------

    var results =
        new List<(MatchScoreResult score, CandidateDriver candidate)>();

    // ========================================================
    // CHECK EACH DRIVER ROUTE
    // ========================================================

    foreach (var candidateRoute in candidateRoutes)
    {
      // ----------------------------------------------------
      // MUST HAVE DRIVER ROLE
      // ----------------------------------------------------

      if (!driverRoles.Contains(
              candidateRoute.UserId))
      {
        continue;
      }

      // ----------------------------------------------------
      // DRIVER PROFILE
      // ----------------------------------------------------

      var profile =
          driverProfiles.FirstOrDefault(
              p => p.UserId == candidateRoute.UserId);

      if (profile == null)
      {
        continue;
      }

      // ----------------------------------------------------
      // DRIVER VEHICLE
      //
      // Select the vehicle with highest seating capacity.
      // ----------------------------------------------------

      var vehicle =
          vehicles
              .Where(v =>
                  v.DriverId ==
                  candidateRoute.UserId)
              .OrderByDescending(
                  v => v.SeatingCapacity)
              .FirstOrDefault();

      // ----------------------------------------------------
      // CANDIDATE
      // ----------------------------------------------------

      var candidate =
          new CandidateDriver
          {
            User = candidateRoute.User,
            Route = candidateRoute,
            Vehicle = vehicle,
            DriverProfile = profile,
            IsDriver = true
          };

      // ----------------------------------------------------
      // CALCULATE SCORE
      // ----------------------------------------------------

      var score =
          CalculateScore(
              requestRoute,
              request.PreferredDepartureTime,
              request.TimeToleranceMinutes,
              request.SeatsNeeded,
              preference,
              candidate);

      if (score.IsEligible)
      {
        results.Add(
            (score, candidate));
      }
    }

    // ========================================================
    // RANK MATCHES
    //
    // Mode 1 receives higher route similarity score,
    // therefore same routes naturally rank above close routes.
    // ========================================================

    var ranked =
        results
            .OrderByDescending(
                x => x.score.TotalScore)
            .ToList();

    // ========================================================
    // REMOVE OLD PENDING MATCHES
    // ========================================================

    await ClearPendingMatchesAsync(
        request.Id,
        ct);

    // ========================================================
    // CREATE NEW MATCHES
    // ========================================================

    var dtos =
        new List<MatchResultDto>();

    foreach (var item in ranked)
    {
      var score =
          item.score;

      var candidate =
          item.candidate;

      var breakdown =
          BuildScoreBreakdown(
              score,
              requestRoute,
              candidate.Route);

      var match =
          new RideMatch
          {
            Id = Guid.NewGuid(),

            RideRequestId =
                  request.Id,

            MatchedUserId =
                  candidate.User.Id,

            VehicleId =
                  candidate.Vehicle?.Id,

            MatchedRouteId =
                  candidate.Route.Id,

            MatchScore =
                  score.TotalScore,

            ScoreBreakdown =
                  breakdown,

            Status =
                  MatchStatus.Pending,

            CreatedAt =
                  DateTime.UtcNow
          };

      _db.RideMatches.Add(match);

      // ----------------------------------------------------
      // MAP TO DTO
      // ----------------------------------------------------

      dtos.Add(
          ToDto(
              match,
              candidate,
              score,
              requestRoute));
    }

    // ========================================================
    // REQUEST STATUS
    // ========================================================

    request.Status =
        ranked.Count > 0
            ? RideRequestStatus.Matching
            : RideRequestStatus.Open;

    // ========================================================
    // SAVE
    // ========================================================

    try
    {
      await _db.SaveChangesAsync(ct);
    }
    catch (DbUpdateException ex)
    {
      var inner =
          ex.InnerException?.Message ??
          ex.Message;

      throw new InvalidOperationException(
          $"Match save failed: {inner}",
          ex);
    }

    return dtos;
  }

  // ============================================================
  // CALCULATE SCORE
  // ============================================================

  public MatchScoreResult CalculateScore(
      Route requestRoute,
      TimeOnly requestTime,
      int toleranceMinutes,
      int seatsNeeded,
      GenderPreferenceRequest preference,
      CandidateDriver candidate)
  {
    var result =
        new MatchScoreResult();

    // --------------------------------------------------------
    // VEHICLE
    // --------------------------------------------------------

    if (candidate.Vehicle == null)
    {
      result.RejectionReason =
          "Driver has no vehicle";

      return result;
    }

    if (candidate.Vehicle.SeatingCapacity <
        seatsNeeded)
    {
      result.RejectionReason =
          "Insufficient seats";

      return result;
    }

    // --------------------------------------------------------
    // DRIVER PROFILE
    // --------------------------------------------------------

    if (candidate.DriverProfile != null &&
        !candidate.DriverProfile.IsAvailable)
    {
      result.RejectionReason =
          "Driver not available";

      return result;
    }

    // --------------------------------------------------------
    // USER ACTIVE
    // --------------------------------------------------------

    if (!candidate.User.IsActive)
    {
      result.RejectionReason =
          "User inactive";

      return result;
    }

    // --------------------------------------------------------
    // GENDER MATCHING
    // --------------------------------------------------------

    var womenOnly =
        preference.Preference ==
            GenderPreference.FemaleOnly ||
        preference.Preference ==
            GenderPreference.WomenOnly;

    if (womenOnly &&
        candidate.User.Gender != Gender.Female)
    {
      result.RejectionReason =
          "Gender restriction";

      return result;
    }

    if (preference.Preference ==
        GenderPreference.MaleOnly &&
        candidate.User.Gender != Gender.Male)
    {
      result.RejectionReason =
          "Gender restriction";

      return result;
    }

    if (candidate.User.WomenOnlyPreference &&
        preference.RequesterGender != Gender.Female)
    {
      result.RejectionReason =
          "Gender restriction";

      return result;
    }

    // --------------------------------------------------------
    // TIME MATCHING
    // --------------------------------------------------------

    var timeDifference =
        Math.Abs(
            (
                candidate.Route
                    .PreferredDepartureTime
                    .ToTimeSpan()
                -
                requestTime.ToTimeSpan()
            ).TotalMinutes);

    var effectiveTolerance =
        Math.Max(
            toleranceMinutes,
            candidate.Route
                .MaximumTimeToleranceMinutes);

    if (timeDifference >
        effectiveTolerance)
    {
      result.RejectionReason =
          "Outside time tolerance";

      return result;
    }

    // --------------------------------------------------------
    // SOURCE DISTANCE
    // --------------------------------------------------------

    var sourceKm =
        HaversineKm(
            (double)requestRoute.SourceLatitude,
            (double)requestRoute.SourceLongitude,
            (double)candidate.Route.SourceLatitude,
            (double)candidate.Route.SourceLongitude);

    // --------------------------------------------------------
    // DESTINATION DISTANCE
    // --------------------------------------------------------

    var destinationKm =
        HaversineKm(
            (double)requestRoute.DestinationLatitude,
            (double)requestRoute.DestinationLongitude,
            (double)candidate.Route.DestinationLatitude,
            (double)candidate.Route.DestinationLongitude);

    // ========================================================
    // MODE 1
    // ========================================================
    //
    // Same / nearly same route:
    //
    // Source <= 1 km
    // Destination <= 1 km
    //
    // Highest priority.
    // ========================================================

    var isMode1 =
        sourceKm <= SameRouteThresholdKm &&
        destinationKm <= SameRouteThresholdKm;

    // ========================================================
    // MODE 2
    // ========================================================
    //
    // Close route:
    //
    // Source <= 12 km
    // Destination <= 12 km
    // ========================================================

    var isMode2 =
        sourceKm <= MaxSourceKm &&
        destinationKm <= MaxDestinationKm;

    // --------------------------------------------------------
    // MODE 1 SCORE
    // --------------------------------------------------------

    if (isMode1)
    {
      var sourceScore =
          SameRouteThresholdKm <= 0
              ? 25m
              : (decimal)(
                  25.0 *
                  (
                      1.0 -
                      sourceKm /
                      SameRouteThresholdKm
                  ));

      var destinationScore =
          SameRouteThresholdKm <= 0
              ? 25m
              : (decimal)(
                  25.0 *
                  (
                      1.0 -
                      destinationKm /
                      SameRouteThresholdKm
                  ));

      result.SourceProximityScore =
          Math.Clamp(
              sourceScore,
              0m,
              25m);

      result.DestinationProximityScore =
          Math.Clamp(
              destinationScore,
              0m,
              25m);

      // Highest route similarity for Mode 1.
      result.RouteSimilarityScore =
          30m;
    }

    // --------------------------------------------------------
    // MODE 2 SCORE
    // --------------------------------------------------------

    else if (isMode2)
    {
      var sourceScore =
          MaxSourceKm <= 0
              ? 20m
              : (decimal)(
                  20.0 *
                  (
                      1.0 -
                      sourceKm /
                      MaxSourceKm
                  ));

      var destinationScore =
          MaxDestinationKm <= 0
              ? 20m
              : (decimal)(
                  20.0 *
                  (
                      1.0 -
                      destinationKm /
                      MaxDestinationKm
                  ));

      result.SourceProximityScore =
          Math.Clamp(
              sourceScore,
              0m,
              20m);

      result.DestinationProximityScore =
          Math.Clamp(
              destinationScore,
              0m,
              20m);

      // Lower route similarity for Mode 2.
      result.RouteSimilarityScore =
          10m;
    }

    // --------------------------------------------------------
    // NO MATCH
    // --------------------------------------------------------

    else
    {
      result.RejectionReason =
          "Route too far for Mode 1 or Mode 2";

      return result;
    }

    // --------------------------------------------------------
    // TIME SCORE
    // --------------------------------------------------------

    if (effectiveTolerance <= 0)
    {
      result.TimeCompatibilityScore =
          timeDifference == 0
              ? 20m
              : 0m;
    }
    else
    {
      result.TimeCompatibilityScore =
          Math.Clamp(
              (decimal)(
                  20.0 *
                  (
                      1.0 -
                      timeDifference /
                      effectiveTolerance
                  )),
              0m,
              20m);
    }

    // --------------------------------------------------------
    // VERIFICATION
    // --------------------------------------------------------

    result.VerificationScore =
        candidate.User.IsVerified
            ? 5m
            : 0m;

    // --------------------------------------------------------
    // PREFERENCE / EXTRA SEAT
    // --------------------------------------------------------

    result.PreferenceScore =
        candidate.Vehicle.SeatingCapacity >=
        seatsNeeded + 1
            ? 5m
            : 3m;

    // --------------------------------------------------------
    // TOTAL SCORE
    // --------------------------------------------------------

    result.TotalScore =
        result.SourceProximityScore +
        result.DestinationProximityScore +
        result.RouteSimilarityScore +
        result.TimeCompatibilityScore +
        result.VerificationScore +
        result.PreferenceScore;

    result.IsEligible =
        true;

    return result;
  }

  // ============================================================
  // CHECK RECURRING DAY
  // ============================================================

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

  // ============================================================
  // CHECK EFFECTIVE DATE RANGE
  // ============================================================

  private static bool IsDateWithinSchedule(
      RideSchedule schedule,
      DateOnly travelDate)
  {
    // Travel date before schedule start.
    if (schedule.EffectiveFrom.HasValue &&
        travelDate < schedule.EffectiveFrom.Value)
    {
      return false;
    }

    // Travel date after schedule end.
    if (schedule.EffectiveTo.HasValue &&
        travelDate > schedule.EffectiveTo.Value)
    {
      return false;
    }

    return true;
  }

  // ============================================================
  // DELETE OLD PENDING MATCHES
  // ============================================================

  private async Task ClearPendingMatchesAsync(
      Guid rideRequestId,
      CancellationToken ct)
  {
    await _db.RideMatches
        .IgnoreQueryFilters()
        .Where(m =>
            m.RideRequestId == rideRequestId &&
            m.Status == MatchStatus.Pending)
        .ExecuteDeleteAsync(ct);
  }

  // ============================================================
  // SCORE BREAKDOWN
  // ============================================================

  private static string BuildScoreBreakdown(
      MatchScoreResult score,
      Route requestRoute,
      Route candidateRoute)
  {
    var sourceKm =
        HaversineKm(
            (double)requestRoute.SourceLatitude,
            (double)requestRoute.SourceLongitude,
            (double)candidateRoute.SourceLatitude,
            (double)candidateRoute.SourceLongitude);

    var destinationKm =
        HaversineKm(
            (double)requestRoute.DestinationLatitude,
            (double)requestRoute.DestinationLongitude,
            (double)candidateRoute.DestinationLatitude,
            (double)candidateRoute.DestinationLongitude);

    var mode =
        sourceKm <= SameRouteThresholdKm &&
        destinationKm <= SameRouteThresholdKm
            ? "Mode 1 - Same Route"
            : "Mode 2 - Close Route";

    return
        $"{mode}; " +
        $"Source:{score.SourceProximityScore:F1}; " +
        $"Dest:{score.DestinationProximityScore:F1}; " +
        $"Route:{score.RouteSimilarityScore:F1}; " +
        $"Time:{score.TimeCompatibilityScore:F1}; " +
        $"Verified:{score.VerificationScore:F1}; " +
        $"Pref:{score.PreferenceScore:F1}; " +
        $"SourceDistance:{sourceKm:F2}km; " +
        $"DestinationDistance:{destinationKm:F2}km";
  }

  // ============================================================
  // HAVERSINE DISTANCE
  // ============================================================

  /// <summary>
  /// Calculates the great-circle distance between two
  /// latitude/longitude coordinates.
  ///
  /// Result is in kilometers.
  /// </summary>
  public static double HaversineKm(
      double lat1,
      double lon1,
      double lat2,
      double lon2)
  {
    const double EarthRadiusKm = 6371.0;

    var dLat =
        DegreesToRadians(
            lat2 - lat1);

    var dLon =
        DegreesToRadians(
            lon2 - lon1);

    // Correct Haversine formula.
    var a =
        Math.Sin(dLat / 2) *
        Math.Sin(dLat / 2)
        +
        Math.Cos(
            DegreesToRadians(lat1))
        *
        Math.Cos(
            DegreesToRadians(lat2))
        *
        Math.Sin(dLon / 2)
        *
        Math.Sin(dLon / 2);

    // Protect against floating point precision errors.
    a = Math.Clamp(
        a,
        0.0,
        1.0);

    var c =
        2 *
        Math.Atan2(
            Math.Sqrt(a),
            Math.Sqrt(1 - a));

    return EarthRadiusKm * c;
  }

  // ============================================================
  // DEGREES TO RADIANS
  // ============================================================

  private static double DegreesToRadians(
      double degrees)
  {
    return degrees *
           Math.PI /
           180.0;
  }

  // ============================================================
  // MAP TO MATCH RESULT DTO
  // ============================================================

  private static MatchResultDto ToDto(
      RideMatch match,
      CandidateDriver candidate,
      MatchScoreResult score,
      Route requestRoute)
  {
    return new MatchResultDto
    {
      MatchId =
            match.Id,

      RideRequestId =
            match.RideRequestId,

      MatchedUserId =
            candidate.User.Id,

      MatchedUserName =
            $"{candidate.User.FirstName} {candidate.User.LastName}"
                .Trim(),

      IsVerified =
            candidate.User.IsVerified,

      Gender =
            candidate.User.Gender.ToString(),

      VehicleId =
            candidate.Vehicle?.Id,

      VehicleInfo =
            candidate.Vehicle == null
                ? null
                : $"Seats: {candidate.Vehicle.SeatingCapacity}",

      SeatingCapacity =
            candidate.Vehicle?.SeatingCapacity,

      MatchedRouteSource =
            candidate.Route.SourceAddress,

      MatchedRouteDestination =
            candidate.Route.DestinationAddress,

      MatchedDepartureTime =
            candidate.Route
                .PreferredDepartureTime
                .ToString("HH:mm"),

      MatchScore =
            score.TotalScore,

      ScoreBreakdown =
            BuildScoreBreakdown(
                score,
                requestRoute,
                candidate.Route),

      Status =
            match.Status.ToString()
    };
  }
}
