using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using RideSharing.Application.DTOs.Geo;
using RideSharing.Application.Interfaces;

namespace RideSharing.Infrastructure.Geo;

/// <summary>
/// OSRM routing service.
/// Uses OSRM for road geometry and falls back to a straight-line
/// route when OSRM is unavailable.
/// </summary>
public class OsrmRoutingService : IRoutingService
{
  private readonly HttpClient _http;
  private readonly ILogger<OsrmRoutingService> _log;

  public OsrmRoutingService(
      HttpClient http,
      ILogger<OsrmRoutingService> log)
  {
    _http = http;
    _log = log;
  }

  public async Task<RouteGeometryResult> GetRouteAsync(
      double sourceLatitude,
      double sourceLongitude,
      double destinationLatitude,
      double destinationLongitude,
      CancellationToken ct = default)
  {
    var inv = CultureInfo.InvariantCulture;

    // OSRM uses longitude,latitude
    var url =
        $"route/v1/driving/" +
        $"{sourceLongitude.ToString(inv)},{sourceLatitude.ToString(inv)};" +
        $"{destinationLongitude.ToString(inv)},{destinationLatitude.ToString(inv)}" +
        "?overview=full&geometries=geojson";

    try
    {
      _log.LogInformation(
          "OSRM request: {SourceLat},{SourceLon} -> {DestinationLat},{DestinationLon}",
          sourceLatitude,
          sourceLongitude,
          destinationLatitude,
          destinationLongitude);

      using var httpRequest =
          new HttpRequestMessage(
              HttpMethod.Get,
              url);

      // OSRM demo server expects a User-Agent.
      httpRequest.Headers.UserAgent.ParseAdd(
          "RideSharingSystem/1.0");

      httpRequest.Headers.Accept.ParseAdd(
          "application/json");

      using var response =
          await _http.SendAsync(
              httpRequest,
              ct);

      if (!response.IsSuccessStatusCode)
      {
        _log.LogWarning(
            "OSRM status {StatusCode}. Using fallback route.",
            (int)response.StatusCode);

        return Fallback(
            sourceLatitude,
            sourceLongitude,
            destinationLatitude,
            destinationLongitude);
      }

      await using var stream =
          await response.Content.ReadAsStreamAsync(ct);

      using var document =
          await JsonDocument.ParseAsync(
              stream,
              cancellationToken: ct);

      var root =
          document.RootElement;

      if (!root.TryGetProperty(
              "routes",
              out var routes))
      {
        _log.LogWarning(
            "OSRM response contains no routes. Using fallback.");

        return Fallback(
            sourceLatitude,
            sourceLongitude,
            destinationLatitude,
            destinationLongitude);
      }

      if (routes.GetArrayLength() == 0)
      {
        _log.LogWarning(
            "OSRM returned zero routes. Using fallback.");

        return Fallback(
            sourceLatitude,
            sourceLongitude,
            destinationLatitude,
            destinationLongitude);
      }

      var route = routes[0];

      var distanceMeters =
          route
              .GetProperty("distance")
              .GetDouble();

      var durationSeconds =
          route
              .GetProperty("duration")
              .GetDouble();

      var coordinates =
          route
              .GetProperty("geometry")
              .GetProperty("coordinates");

      var points =
          new List<GeoPoint>();

      foreach (var coordinate in
               coordinates.EnumerateArray())
      {
        if (coordinate.GetArrayLength() < 2)
          continue;

        // GeoJSON order:
        // [longitude, latitude]
        var longitude =
            coordinate[0].GetDouble();

        var latitude =
            coordinate[1].GetDouble();

        points.Add(
            new GeoPoint(
                latitude,
                longitude));
      }

      if (points.Count < 2)
      {
        _log.LogWarning(
            "OSRM returned insufficient route points. Using fallback.");

        return Fallback(
            sourceLatitude,
            sourceLongitude,
            destinationLatitude,
            destinationLongitude);
      }

      _log.LogInformation(
          "OSRM successful. Distance={DistanceKm:F2} km, Duration={DurationMinutes:F1} min, Points={PointCount}",
          distanceMeters / 1000.0,
          durationSeconds / 60.0,
          points.Count);

      return new RouteGeometryResult
      {
        DistanceKm =
              distanceMeters / 1000.0,

        DurationMinutes =
              durationSeconds / 60.0,

        Points = points
      };
    }
    catch (OperationCanceledException)
        when (ct.IsCancellationRequested)
    {
      _log.LogWarning(
          "OSRM request cancelled. Using fallback.");

      return Fallback(
          sourceLatitude,
          sourceLongitude,
          destinationLatitude,
          destinationLongitude);
    }
    catch (Exception ex)
    {
      _log.LogWarning(
          ex,
          "OSRM routing failed. Using fallback.");

      return Fallback(
          sourceLatitude,
          sourceLongitude,
          destinationLatitude,
          destinationLongitude);
    }
  }

  private static RouteGeometryResult Fallback(
      double latitude1,
      double longitude1,
      double latitude2,
      double longitude2)
  {
    var start =
        new GeoPoint(
            latitude1,
            longitude1);

    var end =
        new GeoPoint(
            latitude2,
            longitude2);

    // Generate enough intermediate points for
    // corridor/progress calculations.
    var points =
        GeoMath.StraightLine(
            start,
            end,
            24);

    var distanceKm =
        GeoMath.HaversineKm(
            latitude1,
            longitude1,
            latitude2,
            longitude2);

    // Approximate 30 km/h.
    var durationMinutes =
        distanceKm / 0.5;

    return new RouteGeometryResult
    {
      DistanceKm = distanceKm,
      DurationMinutes = durationMinutes,
      Points = points
    };
  }
}
