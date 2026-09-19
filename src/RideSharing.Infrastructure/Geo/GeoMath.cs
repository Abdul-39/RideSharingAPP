using RideSharing.Application.DTOs.Geo;
namespace RideSharing.Infrastructure.Geo;

public static class GeoMath
{
  private const double R = 6371.0;
  public static double HaversineKm(double lat1, double lon1, double lat2, double lon2)
  {
    var dLat = ToRad(lat2 - lat1); var dLon = ToRad(lon2 - lon1);
    var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
            Math.Cos(ToRad(lat1)) * Math.Cos(ToRad(lat2)) * Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
    return R * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
  }
  public static double DistancePointToPolylineKm(GeoPoint p, IReadOnlyList<GeoPoint> line)
  {
    if (line == null || line.Count == 0) return double.MaxValue;
    if (line.Count == 1) return HaversineKm(p.Latitude, p.Longitude, line[0].Latitude, line[0].Longitude);
    var min = double.MaxValue;
    for (var i = 0; i < line.Count - 1; i++)
    {
      var d = DistancePointToSegmentKm(p, line[i], line[i + 1]);
      if (d < min) min = d;
    }
    return min;
  }
  public static double DistancePointToSegmentKm(GeoPoint p, GeoPoint a, GeoPoint b)
  {
    var latRad = ToRad(a.Latitude);
    var xP = ToRad(p.Longitude - a.Longitude) * Math.Cos(latRad) * R;
    var yP = ToRad(p.Latitude - a.Latitude) * R;
    var xB = ToRad(b.Longitude - a.Longitude) * Math.Cos(latRad) * R;
    var yB = ToRad(b.Latitude - a.Latitude) * R;
    var len2 = xB * xB + yB * yB;
    if (len2 < 1e-12) return HaversineKm(p.Latitude, p.Longitude, a.Latitude, a.Longitude);
    var t = Math.Clamp((xP * xB + yP * yB) / len2, 0.0, 1.0);
    var dx = xP - t * xB; var dy = yP - t * yB;
    return Math.Sqrt(dx * dx + dy * dy);
  }
  public static IReadOnlyList<GeoPoint> StraightLine(GeoPoint a, GeoPoint b, int segments = 20)
  {
    var list = new List<GeoPoint>(segments + 1);
    for (var i = 0; i <= segments; i++)
    {
      var t = i / (double)segments;
      list.Add(new GeoPoint(a.Latitude + (b.Latitude - a.Latitude) * t, a.Longitude + (b.Longitude - a.Longitude) * t));
    }
    return list;
  }

  public static double DirectionCosine(GeoPoint aFrom, GeoPoint aTo, GeoPoint bFrom, GeoPoint bTo)
  {
    var ax = aTo.Longitude - aFrom.Longitude;
    var ay = aTo.Latitude - aFrom.Latitude;
    var bx = bTo.Longitude - bFrom.Longitude;
    var by = bTo.Latitude - bFrom.Latitude;
    var na = Math.Sqrt(ax * ax + ay * ay);
    var nb = Math.Sqrt(bx * bx + by * by);
    if (na < 1e-12 || nb < 1e-12) return 1.0;
    return (ax * bx + ay * by) / (na * nb);
  }

  public static double ApproximateDetourKm(GeoPoint driverStart, GeoPoint driverEnd, GeoPoint pickup, GeoPoint dropoff)
  {
    var original = HaversineKm(driverStart.Latitude, driverStart.Longitude, driverEnd.Latitude, driverEnd.Longitude);
    var via = HaversineKm(driverStart.Latitude, driverStart.Longitude, pickup.Latitude, pickup.Longitude)
            + HaversineKm(pickup.Latitude, pickup.Longitude, dropoff.Latitude, dropoff.Longitude)
            + HaversineKm(dropoff.Latitude, dropoff.Longitude, driverEnd.Latitude, driverEnd.Longitude);
    return Math.Max(0, via - original);
  }

  /// <summary>
  /// Returns the approximate 0..1 progress of the closest point on a route.
  /// 0 means the route start and 1 means the route end.
  /// </summary>
  public static double ProgressAlongRoute(GeoPoint p, IReadOnlyList<GeoPoint> line)
  {
    if (line == null || line.Count < 2) return 0;

    double total = 0;
    var segLens = new double[line.Count - 1];
    for (var i = 0; i < line.Count - 1; i++)
    {
      segLens[i] = HaversineKm(line[i].Latitude, line[i].Longitude, line[i + 1].Latitude, line[i + 1].Longitude);
      total += segLens[i];
    }
    if (total < 1e-9) return 0;

    var bestProgress = 0.0;
    var bestDistance = double.MaxValue;
    double accumulated = 0;

    for (var i = 0; i < line.Count - 1; i++)
    {
      var d = DistancePointToSegmentKm(p, line[i], line[i + 1]);
      if (d < bestDistance)
      {
        bestDistance = d;
        // The existing distance helper clamps to the segment. The midpoint is
        // deliberately conservative here because we only need route ordering.
        bestProgress = (accumulated + segLens[i] * 0.5) / total;
      }
      accumulated += segLens[i];
    }

    return Math.Clamp(bestProgress, 0, 1);
  }

  /// <summary>
  /// Estimates the road distance travelled on the driver route between two
  /// points that have been projected onto that route.
  /// </summary>
  public static double DistanceBetweenRouteProgressKm(
      IReadOnlyList<GeoPoint> line, double fromProgress, double toProgress)
  {
    if (line == null || line.Count < 2) return 0;

    fromProgress = Math.Clamp(fromProgress, 0, 1);
    toProgress = Math.Clamp(toProgress, 0, 1);
    if (toProgress <= fromProgress) return 0;

    double total = 0;
    for (var i = 0; i < line.Count - 1; i++)
      total += HaversineKm(line[i].Latitude, line[i].Longitude, line[i + 1].Latitude, line[i + 1].Longitude);

    return total * (toProgress - fromProgress);
  }

  /// <summary>
  /// Estimates passenger-induced detour using the driver's actual route
  /// corridor instead of only straight-line endpoint distances.
  /// </summary>
  public static double EstimateCorridorDetourKm(
      GeoPoint driverStart, GeoPoint driverEnd,
      GeoPoint pickup, GeoPoint dropoff,
      IReadOnlyList<GeoPoint> driverRoute,
      double pickupProgress, double dropoffProgress)
  {
    if (driverRoute == null || driverRoute.Count < 2)
      return ApproximateDetourKm(driverStart, driverEnd, pickup, dropoff);

    var routeKm = 0.0;
    for (var i = 0; i < driverRoute.Count - 1; i++)
      routeKm += HaversineKm(driverRoute[i].Latitude, driverRoute[i].Longitude,
                             driverRoute[i + 1].Latitude, driverRoute[i + 1].Longitude);

    if (routeKm < 0.1)
      return ApproximateDetourKm(driverStart, driverEnd, pickup, dropoff);

    var accessToPickup = DistancePointToPolylineKm(pickup, driverRoute);
    var accessFromDropoff = DistancePointToPolylineKm(dropoff, driverRoute);
    // Driver normally travels the route segment between the projected pickup
    // and drop-off points. The passenger trip can be different from that
    // segment, so include the pickup-to-drop-off leg as well.
    var baselineSegment = DistanceBetweenRouteProgressKm(
        driverRoute, pickupProgress, dropoffProgress);
    var passengerLeg = HaversineKm(
        pickup.Latitude, pickup.Longitude,
        dropoff.Latitude, dropoff.Longitude);

    var detour = accessToPickup + passengerLeg + accessFromDropoff - baselineSegment;

    return Math.Max(0, detour);
  }

  private static double ToRad(double d) => d * Math.PI / 180.0;
}
