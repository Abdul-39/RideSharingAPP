using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using RideSharing.Application.DTOs.Geo;
using RideSharing.Application.Interfaces;

namespace RideSharing.Infrastructure.Geo;

/// <summary>
/// Free OpenStreetMap Nominatim geocoder (respect usage policy; set User-Agent).
/// Replaceable via IGeocodingService.
/// </summary>
public class NominatimGeocodingService : IGeocodingService
{
    private readonly HttpClient _http;
    private readonly ILogger<NominatimGeocodingService> _log;

    public NominatimGeocodingService(HttpClient http, ILogger<NominatimGeocodingService> log)
    {
        _http = http;
        _log = log;
    }

    public async Task<IReadOnlyList<GeocodingResult>> SearchAsync(string placeName, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(placeName))
            return Array.Empty<GeocodingResult>();

        // Bias to Pakistan
        var q = Uri.EscapeDataString(placeName.Trim());
        var url = $"search?q={q}&format=json&limit=6&countrycodes=pk&addressdetails=0";
        try
        {
            var items = await _http.GetFromJsonAsync<List<NominatimItem>>(url, ct) ?? new();
            return items
                .Where(i => double.TryParse(i.Lat, out _) && double.TryParse(i.Lon, out _))
                .Select(i => new GeocodingResult
                {
                    DisplayName = i.DisplayName ?? placeName,
                    Latitude = double.Parse(i.Lat!),
                    Longitude = double.Parse(i.Lon!)
                })
                .ToList();
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Nominatim search failed for {Place}", placeName);
            return Array.Empty<GeocodingResult>();
        }
    }

    public async Task<GeocodingResult?> GeocodeAsync(string placeName, CancellationToken ct = default)
    {
        var list = await SearchAsync(placeName, ct);
        return list.FirstOrDefault();
    }

    public async Task<GeocodingResult?> ReverseGeocodeAsync(double latitude, double longitude, CancellationToken ct = default)
    {
        var url = $"reverse?lat={latitude.ToString(System.Globalization.CultureInfo.InvariantCulture)}&lon={longitude.ToString(System.Globalization.CultureInfo.InvariantCulture)}&format=json";
        try
        {
            var item = await _http.GetFromJsonAsync<NominatimItem>(url, ct);
            if (item == null || string.IsNullOrWhiteSpace(item.DisplayName))
                return null;
            return new GeocodingResult
            {
                DisplayName = item.DisplayName,
                Latitude = latitude,
                Longitude = longitude
            };
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Nominatim reverse failed");
            return new GeocodingResult
            {
                DisplayName = $"{latitude:F4}, {longitude:F4}",
                Latitude = latitude,
                Longitude = longitude
            };
        }
    }

    private sealed class NominatimItem
    {
        [JsonPropertyName("display_name")]
        public string? DisplayName { get; set; }
        [JsonPropertyName("lat")]
        public string? Lat { get; set; }
        [JsonPropertyName("lon")]
        public string? Lon { get; set; }
    }
}
