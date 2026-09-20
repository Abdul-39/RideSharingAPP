
using System.Collections.Concurrent;
using System.Globalization;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using RideSharing.Application.DTOs.Geo;
using RideSharing.Application.Interfaces;

namespace RideSharing.Infrastructure.Geo;

/// <summary>
/// Free OpenStreetMap based geocoding service.
///
/// Search strategy:
/// 1. Nominatim Pakistan search using the user's actual query.
/// 2. Nominatim simplified Pakistan search.
/// 3. Overpass fallback for OSM named places.
/// 4. Worldwide Nominatim fallback.
///
/// Important:
/// - We do NOT force every place into Islamabad.
/// - We keep multiple results so the user can select the exact place.
/// - Coordinates are stored with the selected place.
/// - Successful searches are cached.
/// - Empty results are not cached.
/// </summary>
public class NominatimGeocodingService : IGeocodingService
{
  private readonly HttpClient _http;
  private readonly ILogger<NominatimGeocodingService> _log;

  private const string NominatimBaseUrl =
      "https://nominatim.openstreetmap.org/";

  private const string OverpassUrl =
      "https://overpass-api.de/api/interpreter";

  // ================================================================
  // PUBLIC SEARCH
  // ================================================================

  public NominatimGeocodingService(
      HttpClient http,
      ILogger<NominatimGeocodingService> log)
  {
    _http = http;
    _log = log;
  }

  public async Task<IReadOnlyList<GeocodingResult>> SearchAsync(
      string placeName,
      CancellationToken ct = default)
  {
    if (string.IsNullOrWhiteSpace(placeName))
      return Array.Empty<GeocodingResult>();

    var originalQuery =
        NormalizeWhitespace(placeName);

    try
    {
      // ========================================================
      // STEP 1
      // Nominatim Pakistan search
      //
      // IMPORTANT:
      // Do NOT automatically append Islamabad.
      //
      // Example:
      // "Thandapani"
      // becomes:
      // "Thandapani, Pakistan"
      //
      // This allows Nominatim to find Thandapani in
      // Abbottabad/KP instead of incorrectly forcing Islamabad.
      // ========================================================

      var pakistanQueries =
          BuildPakistanQueries(originalQuery);

      var pakistanResults =
          new List<GeocodingResult>();

      foreach (var query in pakistanQueries)
      {
        ct.ThrowIfCancellationRequested();

        _log.LogDebug(
            "Nominatim Pakistan search: {Query}",
            query);

        var results =
            await SearchNominatimAsync(
                query,
                countryCodes: "pk",
                ct);

        pakistanResults.AddRange(results);

        // If we already have enough useful candidates,
        // don't hit Nominatim again.
        if (CountUsefulResults(pakistanResults) >= 8)
          break;
      }

      var rankedPakistanResults =
          RankAndDeduplicate(
              pakistanResults,
              originalQuery,
              preferPakistan: true);

      if (rankedPakistanResults.Count > 0)
      {
        _log.LogInformation(
            "Nominatim found {Count} Pakistan result(s) for {Query}.",
            rankedPakistanResults.Count,
            originalQuery);

        return rankedPakistanResults
            .Take(8)
            .ToList();
      }

      // ========================================================
      // STEP 2
      // Overpass fallback
      //
      // This is only used when Nominatim cannot find anything.
      //
      // No Islamabad-only bounding box is used.
      // ========================================================

      _log.LogInformation(
          "Nominatim returned no Pakistan result for {Place}; trying Overpass.",
          originalQuery);

      var overpassResults =
          await SearchOverpassAsync(
              originalQuery,
              ct);

      var rankedOverpassResults =
          RankAndDeduplicate(
              overpassResults,
              originalQuery,
              preferPakistan: true);

      if (rankedOverpassResults.Count > 0)
      {
        _log.LogInformation(
            "Overpass found {Count} result(s) for {Query}.",
            rankedOverpassResults.Count,
            originalQuery);

        return rankedOverpassResults
            .Take(8)
            .ToList();
      }

      // ========================================================
      // STEP 3
      // Worldwide Nominatim fallback
      // ========================================================

      _log.LogInformation(
          "No Pakistan/Overpass result for {Place}; trying worldwide search.",
          originalQuery);

      var worldwideQueries =
          BuildWorldwideQueries(originalQuery);

      var worldwideResults =
          new List<GeocodingResult>();

      foreach (var query in worldwideQueries)
      {
        ct.ThrowIfCancellationRequested();

        var results =
            await SearchNominatimAsync(
                query,
                countryCodes: null,
                ct);

        worldwideResults.AddRange(results);

        if (CountUsefulResults(worldwideResults) >= 8)
          break;
      }

      return RankAndDeduplicate(
              worldwideResults,
              originalQuery,
              preferPakistan: false)
          .Take(8)
          .ToList();
    }
    catch (OperationCanceledException)
        when (ct.IsCancellationRequested)
    {
      throw;
    }
    catch (Exception ex)
    {
      _log.LogWarning(
          ex,
          "Geocoding search failed for {Place}",
          originalQuery);

      return Array.Empty<GeocodingResult>();
    }
  }

  // ================================================================
  // QUERY BUILDERS
  // ================================================================

  private static IReadOnlyList<string> BuildPakistanQueries(
      string originalQuery)
  {
    var queries =
        new List<string>();

    var normalized =
        NormalizeSearchText(originalQuery);

    // First attempt:
    //
    // User's query exactly as Pakistan search.
    //
    // Example:
    // "Thandapani"
    // "Khanna Pull"
    // "Punjgran"
    // "Tarlai"
    AddUnique(
        queries,
        $"{normalized}, Pakistan");

    // Second attempt:
    //
    // Remove Pakistan/Islamabad words supplied by the user
    // and search the local name across Pakistan.
    //
    // This is important for:
    //
    // "Khanna Pull, Islamabad"
    //
    // because OSM may classify Khanna Pull under Rawalpindi.
    var localPart =
        RemoveAdministrativeWords(normalized);

    if (!string.IsNullOrWhiteSpace(localPart))
    {
      AddUnique(
          queries,
          $"{localPart}, Pakistan");
    }

    // Third attempt only if the user provided a longer query
    // containing a locality/city.
    //
    // We keep this as a final fallback rather than automatically
    // forcing Islamabad.
    if (!string.Equals(
            localPart,
            normalized,
            StringComparison.OrdinalIgnoreCase))
    {
      AddUnique(
          queries,
          localPart);
    }

    return queries;
  }

  private static IReadOnlyList<string> BuildWorldwideQueries(
      string originalQuery)
  {
    var queries =
        new List<string>();

    AddUnique(
        queries,
        originalQuery);

    var localPart =
        RemoveAdministrativeWords(originalQuery);

    if (!string.IsNullOrWhiteSpace(localPart))
    {
      AddUnique(
          queries,
          localPart);
    }

    return queries;
  }

  private static string RemoveAdministrativeWords(
      string value)
  {
    var parts =
        value.Split(
            ',',
            StringSplitOptions.RemoveEmptyEntries |
            StringSplitOptions.TrimEntries);

    var filtered =
        parts
            .Where(x =>
                !x.Equals(
                    "Pakistan",
                    StringComparison.OrdinalIgnoreCase) &&
                !x.Equals(
                    "Islamabad",
                    StringComparison.OrdinalIgnoreCase))
            .ToList();

    return string.Join(", ", filtered);
  }

  // ================================================================
  // NOMINATIM SEARCH
  // ================================================================

  private async Task<IReadOnlyList<GeocodingResult>>
      SearchNominatimAsync(
          string query,
          string? countryCodes,
          CancellationToken ct)
  {
    var cacheKey =
        $"nominatim|{countryCodes ?? "world"}|{query}"
            .ToLowerInvariant();

    if (SearchCache.TryGetValue(
            cacheKey,
            out var cached) &&
        cached.ExpiresAt > DateTimeOffset.UtcNow)
    {
      return cached.Results;
    }

    var encodedQuery =
        Uri.EscapeDataString(query);

    var url =
        $"{NominatimBaseUrl}search" +
        $"?q={encodedQuery}" +
        "&format=jsonv2" +
        "&limit=8" +
        "&addressdetails=1" +
        "&accept-language=en";

    if (!string.IsNullOrWhiteSpace(countryCodes))
    {
      url +=
          $"&countrycodes={countryCodes}";
    }

    await WaitForNominatimSlotAsync(ct);

    try
    {
      var items =
          await _http.GetFromJsonAsync<
              List<NominatimItem>>(
                  url,
                  ct)
          ?? new List<NominatimItem>();

      var results =
          new List<GeocodingResult>();

      foreach (var item in items)
      {
        if (!TryParseCoordinate(
                item.Lat,
                out var latitude))
        {
          continue;
        }

        if (!TryParseCoordinate(
                item.Lon,
                out var longitude))
        {
          continue;
        }

        if (!IsValidCoordinate(
                latitude,
                longitude))
        {
          continue;
        }

        results.Add(
            new GeocodingResult
            {
              DisplayName =
                    string.IsNullOrWhiteSpace(
                        item.DisplayName)
                        ? query
                        : item.DisplayName,

              Latitude = latitude,
              Longitude = longitude
            });
      }

      // Only cache successful results.
      if (results.Count > 0)
      {
        SearchCache[cacheKey] =
            (
                DateTimeOffset.UtcNow.AddHours(1),
                results
            );
      }

      return results;
    }
    catch (OperationCanceledException)
        when (ct.IsCancellationRequested)
    {
      throw;
    }
    catch (Exception ex)
    {
      _log.LogWarning(
          ex,
          "Nominatim request failed for {Query}",
          query);

      return Array.Empty<GeocodingResult>();
    }
  }

  // ================================================================
  // OVERPASS FALLBACK
  // ================================================================

  private async Task<IReadOnlyList<GeocodingResult>>
      SearchOverpassAsync(
          string query,
          CancellationToken ct)
  {
    var cacheKey =
        $"overpass|{query}"
            .ToLowerInvariant();

    if (SearchCache.TryGetValue(
            cacheKey,
            out var cached) &&
        cached.ExpiresAt > DateTimeOffset.UtcNow)
    {
      return cached.Results;
    }

    var cleanQuery =
        NormalizeSearchText(query);

    var searchName =
        RemoveAdministrativeWords(cleanQuery);

    if (string.IsNullOrWhiteSpace(searchName))
    {
      searchName = cleanQuery;
    }

    var escapedName =
        EscapeOverpassRegex(searchName);

    // ============================================================
    // IMPORTANT
    //
    // Old code searched only:
    //
    // 33.45,72.70,33.90,73.35
    //
    // That is an Islamabad-only box.
    //
    // This version searches Pakistan by OSM country area.
    // ============================================================

    var overpassQuery = $@"
[out:json][timeout:12];

area[""ISO3166-1""=""PK""][admin_level=2]->.pakistan;

(
  nwr[""name""~""{escapedName}"",i](area.pakistan);
  nwr[""official_name""~""{escapedName}"",i](area.pakistan);
  nwr[""alt_name""~""{escapedName}"",i](area.pakistan);
);

out center tags;
";

    try
    {
      await WaitForOverpassSlotAsync(ct);

      // IMPORTANT:
      // Overpass expects the query as text/data.
      //
      // The old code sent it as:
      // application/x-www-form-urlencoded
      //
      // which is not the correct representation of the
      // raw Overpass query.
      using var content =
          new StringContent(
              overpassQuery,
              Encoding.UTF8,
              "text/plain");

      using var response =
          await _http.PostAsync(
              OverpassUrl,
              content,
              ct);

      if (!response.IsSuccessStatusCode)
      {
        _log.LogWarning(
            "Overpass returned HTTP {StatusCode} for {Query}.",
            (int)response.StatusCode,
            query);

        return Array.Empty<GeocodingResult>();
      }

      var json =
          await response.Content.ReadAsStringAsync(ct);

      if (string.IsNullOrWhiteSpace(json))
      {
        return Array.Empty<GeocodingResult>();
      }

      var data =
          JsonSerializer.Deserialize<
              OverpassResponse>(
                  json,
                  JsonOptions);

      if (data?.Elements == null ||
          data.Elements.Count == 0)
      {
        return Array.Empty<GeocodingResult>();
      }

      var results =
          new List<GeocodingResult>();

      foreach (var element in data.Elements)
      {
        var point =
            GetElementCoordinates(element);

        if (point == null)
          continue;

        if (!IsValidCoordinate(
                point.Value.Latitude,
                point.Value.Longitude))
        {
          continue;
        }

        var displayName =
            BuildOverpassDisplayName(
                element,
                searchName);

        results.Add(
            new GeocodingResult
            {
              DisplayName = displayName,
              Latitude =
                    point.Value.Latitude,
              Longitude =
                    point.Value.Longitude
            });
      }

      if (results.Count > 0)
      {
        SearchCache[cacheKey] =
            (
                DateTimeOffset.UtcNow.AddHours(1),
                results
            );
      }

      _log.LogInformation(
          "Overpass returned {Count} result(s) for {Query}.",
          results.Count,
          query);

      return results;
    }
    catch (OperationCanceledException)
        when (ct.IsCancellationRequested)
    {
      throw;
    }
    catch (Exception ex)
    {
      _log.LogWarning(
          ex,
          "Overpass search failed for {Query}",
          query);

      return Array.Empty<GeocodingResult>();
    }
  }

  private static string BuildOverpassDisplayName(
      OverpassElement element,
      string fallback)
  {
    if (element.Tags != null)
    {
      if (element.Tags.TryGetValue(
              "name",
              out var name) &&
          !string.IsNullOrWhiteSpace(name))
      {
        var parts =
            new List<string>
            {
                        name
            };

        if (element.Tags.TryGetValue(
                "addr:city",
                out var city) &&
            !string.IsNullOrWhiteSpace(city))
        {
          parts.Add(city);
        }

        if (element.Tags.TryGetValue(
                "addr:district",
                out var district) &&
            !string.IsNullOrWhiteSpace(district) &&
            !parts.Any(x =>
                x.Equals(
                    district,
                    StringComparison.OrdinalIgnoreCase)))
        {
          parts.Add(district);
        }

        parts.Add("Pakistan");

        return string.Join(
            ", ",
            parts.Distinct(
                StringComparer.OrdinalIgnoreCase));
      }

      if (element.Tags.TryGetValue(
              "official_name",
              out var officialName) &&
          !string.IsNullOrWhiteSpace(
              officialName))
      {
        return $"{officialName}, Pakistan";
      }

      if (element.Tags.TryGetValue(
              "alt_name",
              out var altName) &&
          !string.IsNullOrWhiteSpace(
              altName))
      {
        return $"{altName}, Pakistan";
      }
    }

    return $"{fallback}, Pakistan";
  }

  private static (double Latitude, double Longitude)?
      GetElementCoordinates(
          OverpassElement element)
  {
    if (element.Lat.HasValue &&
        element.Lon.HasValue)
    {
      return (
          element.Lat.Value,
          element.Lon.Value
      );
    }

    if (element.Center?.Lat.HasValue == true &&
        element.Center.Lon.HasValue)
    {
      return (
          element.Center.Lat.Value,
          element.Center.Lon.Value
      );
    }

    return null;
  }

  private static string EscapeOverpassRegex(
      string value)
  {
    // Escape regex characters used by Overpass.
    return value
        .Replace("\\", "\\\\")
        .Replace(".", "\\.")
        .Replace("+", "\\+")
        .Replace("*", "\\*")
        .Replace("?", "\\?")
        .Replace("(", "\\(")
        .Replace(")", "\\)")
        .Replace("[", "\\[")
        .Replace("]", "\\]")
        .Replace("{", "\\{")
        .Replace("}", "\\}")
        .Replace("^", "\\^")
        .Replace("$", "\\$")
        .Replace("|", "\\|");
  }

  // ================================================================
  // RESULT RANKING
  // ================================================================

  private static IReadOnlyList<GeocodingResult>
      RankAndDeduplicate(
          IEnumerable<GeocodingResult> input,
          string originalQuery,
          bool preferPakistan)
  {
    var terms =
        NormalizeSearchText(originalQuery)
            .Split(
                new[] { ' ', ',' },
                StringSplitOptions.RemoveEmptyEntries |
                StringSplitOptions.TrimEntries)
            .Where(x => x.Length >= 2)
            .Select(x =>
                x.ToLowerInvariant())
            .Distinct()
            .ToList();

    return input
        .GroupBy(x =>
            $"{x.Latitude:F6}|{x.Longitude:F6}")
        .Select(g => g.First())
        .OrderByDescending(x =>
            CalculateScore(
                x,
                terms,
                preferPakistan))
        .ThenBy(x =>
            x.DisplayName ?? string.Empty)
        .ToList();
  }

  private static int CalculateScore(
      GeocodingResult result,
      IReadOnlyCollection<string> terms,
      bool preferPakistan)
  {
    var display =
        NormalizeSearchText(
            result.DisplayName ?? string.Empty)
            .ToLowerInvariant();

    var score = 0;

    if (preferPakistan &&
        display.Contains("pakistan"))
    {
      score += 100;
    }

    foreach (var term in terms)
    {
      if (display.Contains(term))
      {
        score += 10;
      }
    }

    if (terms.Count > 0 &&
        terms.All(display.Contains))
    {
      score += 25;
    }

    return score;
  }

  // ================================================================
  // TEXT HELPERS
  // ================================================================

  private static string NormalizeWhitespace(
      string value)
  {
    return string.Join(
        " ",
        value
            .Split(
                (char[]?)null,
                StringSplitOptions.RemoveEmptyEntries));
  }

  private static string NormalizeSearchText(
      string value)
  {
    var normalized =
        NormalizeWhitespace(value);

    // Common spelling variations.
    normalized =
        normalized
            .Replace(
                "khanna pull",
                "Khanna Pull",
                StringComparison.OrdinalIgnoreCase)
            .Replace(
                "khanna pul",
                "Khanna Pull",
                StringComparison.OrdinalIgnoreCase)
            .Replace(
                "khanna-pull",
                "Khanna Pull",
                StringComparison.OrdinalIgnoreCase)
            .Replace(
                "niloor",
                "Nilore",
                StringComparison.OrdinalIgnoreCase)
            .Replace(
                "nilore",
                "Nilore",
                StringComparison.OrdinalIgnoreCase)
            .Replace(
                "thanda pani",
                "Thandapani",
                StringComparison.OrdinalIgnoreCase)
            .Replace(
                "tarlai kalan",
                "Tarlai Kalan",
                StringComparison.OrdinalIgnoreCase)
            .Replace(
                "punjgran",
                "Punjgran",
                StringComparison.OrdinalIgnoreCase);

    return normalized;
  }

  private static void AddUnique(
      ICollection<string> list,
      string value)
  {
    if (string.IsNullOrWhiteSpace(value))
      return;

    value =
        NormalizeWhitespace(value);

    if (!list.Any(x =>
            string.Equals(
                x,
                value,
                StringComparison.OrdinalIgnoreCase)))
    {
      list.Add(value);
    }
  }

  private static int CountUsefulResults(
      IEnumerable<GeocodingResult> results)
  {
    return results
        .GroupBy(x =>
            $"{x.Latitude:F6}|{x.Longitude:F6}")
        .Count();
  }

  private static bool TryParseCoordinate(
      string? value,
      out double coordinate)
  {
    return double.TryParse(
        value,
        NumberStyles.Float,
        CultureInfo.InvariantCulture,
        out coordinate);
  }

  private static bool IsValidCoordinate(
      double latitude,
      double longitude)
  {
    return
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180;
  }

  // ================================================================
  // NOMINATIM RATE LIMIT
  // ================================================================

  private static readonly SemaphoreSlim
      NominatimGate = new(1, 1);

  private static DateTimeOffset
      _lastNominatimRequest =
          DateTimeOffset.MinValue;

  private static async Task
      WaitForNominatimSlotAsync(
          CancellationToken ct)
  {
    await NominatimGate.WaitAsync(ct);

    try
    {
      var elapsed =
          DateTimeOffset.UtcNow -
          _lastNominatimRequest;

      var minimumGap =
          TimeSpan.FromMilliseconds(1100);

      if (elapsed < minimumGap)
      {
        await Task.Delay(
            minimumGap - elapsed,
            ct);
      }

      _lastNominatimRequest =
          DateTimeOffset.UtcNow;
    }
    finally
    {
      NominatimGate.Release();
    }
  }

  // ================================================================
  // OVERPASS RATE LIMIT
  // ================================================================

  private static readonly SemaphoreSlim
      OverpassGate = new(1, 1);

  private static DateTimeOffset
      _lastOverpassRequest =
          DateTimeOffset.MinValue;

  private static async Task
      WaitForOverpassSlotAsync(
          CancellationToken ct)
  {
    await OverpassGate.WaitAsync(ct);

    try
    {
      var elapsed =
          DateTimeOffset.UtcNow -
          _lastOverpassRequest;

      var minimumGap =
          TimeSpan.FromMilliseconds(1100);

      if (elapsed < minimumGap)
      {
        await Task.Delay(
            minimumGap - elapsed,
            ct);
      }

      _lastOverpassRequest =
          DateTimeOffset.UtcNow;
    }
    finally
    {
      OverpassGate.Release();
    }
  }

  // ================================================================
  // CACHE
  // ================================================================

  private static readonly ConcurrentDictionary<
      string,
      (
          DateTimeOffset ExpiresAt,
          IReadOnlyList<GeocodingResult> Results
      )>
      SearchCache = new();

  // ================================================================
  // GEOCODE
  // ================================================================

  public async Task<GeocodingResult?> GeocodeAsync(
      string placeName,
      CancellationToken ct = default)
  {
    var results =
        await SearchAsync(
            placeName,
            ct);

    return results.FirstOrDefault();
  }

  // ================================================================
  // REVERSE GEOCODE
  // ================================================================

  public async Task<GeocodingResult?>
      ReverseGeocodeAsync(
          double latitude,
          double longitude,
          CancellationToken ct = default)
  {
    var url =
        $"{NominatimBaseUrl}reverse" +
        $"?lat={latitude.ToString(CultureInfo.InvariantCulture)}" +
        $"&lon={longitude.ToString(CultureInfo.InvariantCulture)}" +
        "&format=jsonv2" +
        "&addressdetails=1" +
        "&accept-language=en";

    await WaitForNominatimSlotAsync(ct);

    try
    {
      var item =
          await _http.GetFromJsonAsync<
              NominatimItem>(
                  url,
                  ct);

      if (item == null)
        return null;

      return new GeocodingResult
      {
        DisplayName =
              item.DisplayName ??
              $"{latitude:F6}, {longitude:F6}",

        Latitude = latitude,
        Longitude = longitude
      };
    }
    catch (OperationCanceledException)
        when (ct.IsCancellationRequested)
    {
      throw;
    }
    catch (Exception ex)
    {
      _log.LogWarning(
          ex,
          "Nominatim reverse geocoding failed.");

      return new GeocodingResult
      {
        DisplayName =
              $"{latitude:F6}, {longitude:F6}",

        Latitude = latitude,
        Longitude = longitude
      };
    }
  }

  // ================================================================
  // JSON MODELS
  // ================================================================

  private sealed class NominatimItem
  {
    [JsonPropertyName("display_name")]
    public string? DisplayName { get; set; }

    [JsonPropertyName("lat")]
    public string? Lat { get; set; }

    [JsonPropertyName("lon")]
    public string? Lon { get; set; }
  }

  private sealed class OverpassResponse
  {
    [JsonPropertyName("elements")]
    public List<OverpassElement> Elements { get; set; } = new();
  }

  private sealed class OverpassElement
  {
    [JsonPropertyName("type")]
    public string? Type { get; set; }

    [JsonPropertyName("id")]
    public long Id { get; set; }

    [JsonPropertyName("lat")]
    public double? Lat { get; set; }

    [JsonPropertyName("lon")]
    public double? Lon { get; set; }

    [JsonPropertyName("center")]
    public OverpassCenter? Center { get; set; }

    [JsonPropertyName("tags")]
    public Dictionary<string, string>? Tags { get; set; }
  }

  private sealed class OverpassCenter
  {
    [JsonPropertyName("lat")]
    public double? Lat { get; set; }

    [JsonPropertyName("lon")]
    public double? Lon { get; set; }
  }

  private static readonly JsonSerializerOptions JsonOptions =
      new()
      {
        PropertyNameCaseInsensitive = true
      };
}

