using System.Security.Claims;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideSharing.Application.DTOs.Rides;
using RideSharing.Application.Interfaces;

namespace RideSharing.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
[Authorize]
public class RidesController : ControllerBase
{
    private readonly IRideService _rides;
    public RidesController(IRideService rides) => _rides = rides;
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private bool IsAdmin => User.IsInRole("Admin");

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRideFromMatchRequest body)
    {
        var r = await _rides.CreateFromMatchAsync(UserId, body.MatchId);
        return r.Success ? Ok(r) : BadRequest(r);
    }

    [HttpGet("my")]
    public async Task<IActionResult> GetMy([FromQuery] string? filter = null)
        => Ok(await _rides.GetMyRidesAsync(UserId, filter));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var r = await _rides.GetByIdAsync(id, UserId, IsAdmin);
        if (!r.Success) return r.Message.Contains("Not allowed") ? Forbid() : NotFound(r);
        return Ok(r);
    }

    [HttpPost("{id:guid}/confirm")]
    public async Task<IActionResult> Confirm(Guid id)
    {
        var r = await _rides.ConfirmAsync(id, UserId);
        return r.Success ? Ok(r) : BadRequest(r);
    }

    [HttpPost("{id:guid}/driver-arriving")]
    public async Task<IActionResult> DriverArriving(Guid id)
    {
        var r = await _rides.MarkDriverArrivingAsync(id, UserId);
        return r.Success ? Ok(r) : BadRequest(r);
    }

    [HttpPost("{id:guid}/driver-arrived")]
    public async Task<IActionResult> DriverArrived(Guid id)
    {
        var r = await _rides.MarkDriverArrivedAsync(id, UserId);
        return r.Success ? Ok(r) : BadRequest(r);
    }

    [HttpPost("{id:guid}/start")]
    public async Task<IActionResult> Start(Guid id)
    {
        var r = await _rides.StartAsync(id, UserId);
        return r.Success ? Ok(r) : BadRequest(r);
    }

    [HttpPost("{id:guid}/complete")]
    public async Task<IActionResult> Complete(Guid id)
    {
        var r = await _rides.CompleteAsync(id, UserId);
        return r.Success ? Ok(r) : BadRequest(r);
    }

    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id, [FromBody] CancelRideRequest? body)
    {
        var r = await _rides.CancelAsync(id, UserId, body?.Reason);
        return r.Success ? Ok(r) : BadRequest(r);
    }
}
