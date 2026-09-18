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
    var best = 0.0; var bestD = double.MaxValue; double acc = 0;
    for (var i = 0; i < line.Count - 1; i++)
    {
      var d = DistancePointToSegmentKm(p, line[i], line[i + 1]);
      if (d < bestD) { bestD = d; best = (acc + segLens[i] * 0.5) / total; }
      acc += segLens[i];
    }
    return best;
  }

  private static double ToRad(double d) => d * Math.PI / 180.0;
}
