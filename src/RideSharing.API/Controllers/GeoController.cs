using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideSharing.Application.Interfaces;
namespace RideSharing.API.Controllers;
[ApiController]
[Route("api/v1/geo")]
public class GeoController : ControllerBase
{
    private readonly IGeocodingService _geo;
    public GeoController(IGeocodingService geo) => _geo = geo;
    [HttpGet("search")]
    [AllowAnonymous]
    public async Task<IActionResult> Search([FromQuery] string q, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(q)) return BadRequest(new { success = false, message = "Query required" });
        return Ok(new { success = true, data = await _geo.SearchAsync(q, ct) });
    }
    [HttpGet("reverse")]
    [AllowAnonymous]
    public async Task<IActionResult> Reverse([FromQuery] double lat, [FromQuery] double lng, CancellationToken ct)
        => Ok(new { success = true, data = await _geo.ReverseGeocodeAsync(lat, lng, ct) });
}
