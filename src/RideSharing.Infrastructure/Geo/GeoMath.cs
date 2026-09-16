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
    private static double ToRad(double d) => d * Math.PI / 180.0;
}
