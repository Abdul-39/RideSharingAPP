using System.Security.Claims;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideSharing.Application.DTOs.Ratings;
using RideSharing.Application.Interfaces;

namespace RideSharing.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/ratings")]
[Authorize]
public class RatingsController : ControllerBase
{
    private readonly IRatingService _ratings;
    public RatingsController(IRatingService ratings) => _ratings = ratings;
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpPost]
    public async Task<IActionResult> Submit([FromBody] SubmitRatingRequest body)
    {
        var r = await _ratings.SubmitAsync(UserId, body);
        return r.Success ? Ok(r) : BadRequest(r);
    }

    [HttpGet("ride/{rideId:guid}")]
    public async Task<IActionResult> ForRide(Guid rideId)
    {
        var r = await _ratings.GetForRideAsync(rideId, UserId);
        return r.Success ? Ok(r) : BadRequest(r);
    }

    [HttpGet("has-rated")]
    public async Task<IActionResult> HasRated([FromQuery] Guid rideId, [FromQuery] Guid toUserId)
        => Ok(await _ratings.HasRatedAsync(rideId, UserId, toUserId));
}
