using System.Security.Claims;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideSharing.Application.DTOs.Location;
using RideSharing.Application.Interfaces;

namespace RideSharing.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
[Authorize]
public class LocationsController : ControllerBase
{
    private readonly ILocationService _locations;
    public LocationsController(ILocationService locations) => _locations = locations;
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    /// <summary>Update current GPS position (stored in UserLocations, not on Users).</summary>
    [HttpPost("me")]
    public async Task<IActionResult> UpdateMine([FromBody] UpdateLocationRequest body)
    {
        var result = await _locations.UpdateMyLocationAsync(UserId, body);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMine()
        => Ok(await _locations.GetMyCurrentLocationAsync(UserId));

    [HttpPost("route")]
    public async Task<IActionResult> CalculateRoute([FromBody] RouteCalculationRequest body)
        => Ok(await _locations.CalculateRouteAsync(body));

    [HttpGet("nearby-drivers")]
    public async Task<IActionResult> NearbyDrivers([FromQuery] double lat, [FromQuery] double lng, [FromQuery] double radiusKm = 5)
        => Ok(await _locations.GetNearbyDriversAsync(UserId, lat, lng, radiusKm));

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string q)
        => Ok(await _locations.SearchPlacesAsync(q ?? ""));
}
