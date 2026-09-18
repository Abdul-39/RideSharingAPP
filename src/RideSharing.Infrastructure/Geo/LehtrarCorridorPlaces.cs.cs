using RideSharing.Application.DTOs.Geo;

namespace RideSharing.Infrastructure.Geo;

/// <summary>
/// Known places along Lehtrar Road / Islamabad–Rawalpindi corridor for demos.
/// Coordinates are approximate; used to document that matching is corridor-based
/// (e.g. Driver: Tarlai Kalan → Saddar, Passenger: Tramri Chowk → near Saddar).
/// </summary>
public static class LehtrarCorridorPlaces
{
  // Approx WGS84 — good enough for FYP corridor demos
  public static readonly IReadOnlyList<(string Name, GeoPoint Point)> Places = new List<(string, GeoPoint)>
    {
        ("Khanna Pull", new GeoPoint(33.6335, 73.1005)),
        ("Barma", new GeoPoint(33.6200, 73.1150)),
        ("Ghouri Town", new GeoPoint(33.6050, 73.1300)),
        ("Tarlai Kalan", new GeoPoint(33.5900, 73.1450)),
        ("Chak Shahzad", new GeoPoint(33.6680, 73.1450)),
        ("Chattha Bakhtawar", new GeoPoint(33.6550, 73.1550)),
        ("Tramri Chowk", new GeoPoint(33.5750, 73.1600)),
        ("Alipur Farash", new GeoPoint(33.5600, 73.1750)),
        ("Jhang Syedan", new GeoPoint(33.5450, 73.1850)),
        ("Thanda Pani", new GeoPoint(33.5300, 73.1950)),
        ("Seknal", new GeoPoint(33.5200, 73.2050)),
        ("Niloor", new GeoPoint(33.5100, 73.2150)),
        ("Rawal Chowk", new GeoPoint(33.6850, 73.0950)),
        ("COMSATS Park Road", new GeoPoint(33.6510, 73.1560)),
        ("Saddar Rawalpindi", new GeoPoint(33.5930, 73.0550)),
        ("Faizabad", new GeoPoint(33.6630, 73.0750)),
        ("I-8 Markaz", new GeoPoint(33.6685, 73.0755)),
        ("Blue Area", new GeoPoint(33.7150, 73.0650)),
        ("F-10 Markaz", new GeoPoint(33.6935, 73.0150)),
    };

  /// <summary>
  /// Insert corridor landmarks that lie near the road polyline (within maxKm)
  /// so local place names densify the corridor for matching demos.
  /// </summary>
  public static IReadOnlyList<GeoPoint> EnrichWithNearbyPlaces(
      IReadOnlyList<GeoPoint> road,
      double maxKm = 1.5)
  {
    if (road == null || road.Count == 0) return road;
    var result = new List<GeoPoint>(road);
    foreach (var (_, pt) in Places)
    {
      var d = GeoMath.DistancePointToPolylineKm(pt, road);
      if (d <= maxKm)
        result.Add(pt);
    }
    return result;
  }
}
