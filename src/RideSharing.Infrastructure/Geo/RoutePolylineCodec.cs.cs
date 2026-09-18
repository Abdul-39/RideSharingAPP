using System.Text.Json;
using RideSharing.Application.DTOs.Geo;

namespace RideSharing.Infrastructure.Geo;

public static class RoutePolylineCodec
{
  private static readonly JsonSerializerOptions Opts = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

  public static string Serialize(IReadOnlyList<GeoPoint> points)
  {
    var arr = points.Select(p => new { lat = p.Latitude, lng = p.Longitude }).ToList();
    return JsonSerializer.Serialize(arr, Opts);
  }

  public static IReadOnlyList<GeoPoint> Deserialize(string? json)
  {
    if (string.IsNullOrWhiteSpace(json)) return Array.Empty<GeoPoint>();
    try
    {
      using var doc = JsonDocument.Parse(json);
      var list = new List<GeoPoint>();
      foreach (var el in doc.RootElement.EnumerateArray())
      {
        double lat = 0, lng = 0;
        if (el.TryGetProperty("lat", out var la)) lat = la.GetDouble();
        else if (el.TryGetProperty("Latitude", out var la2)) lat = la2.GetDouble();
        if (el.TryGetProperty("lng", out var lo)) lng = lo.GetDouble();
        else if (el.TryGetProperty("lon", out var lon)) lng = lon.GetDouble();
        else if (el.TryGetProperty("Longitude", out var lo2)) lng = lo2.GetDouble();
        list.Add(new GeoPoint(lat, lng));
      }
      return list;
    }
    catch
    {
      return Array.Empty<GeoPoint>();
    }
  }
}
