using System.Security.Claims;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideSharing.Application.DTOs.Rides;
using RideSharing.Application.Interfaces;

namespace RideSharing.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/ride-requests")]
[Authorize]
public class RideRequestsController : ControllerBase
{
    private readonly IRideRequestService _service;

    public RideRequestsController(IRideRequestService service) => _service = service;

    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private bool IsAdmin => User.IsInRole("Admin");

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRideRequestDto request)
    {
        var result = await _service.CreateAsync(UserId, request);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpGet("my")]
    public async Task<IActionResult> GetMy()
    {
        var result = await _service.GetMyAsync(UserId);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _service.GetByIdAsync(id, UserId, IsAdmin);
        if (!result.Success)
            return result.Message.Contains("Not allowed") ? Forbid() : NotFound(result);
        return Ok(result);
    }

    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id)
    {
        var result = await _service.CancelAsync(id, UserId);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    /// <summary>Run matching engine and return ranked matches.</summary>
    [HttpPost("{id:guid}/match")]
    public async Task<IActionResult> Match(Guid id)
    {
        var result = await _service.RunMatchingAsync(id, UserId);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpGet("{id:guid}/matches")]
    public async Task<IActionResult> GetMatches(Guid id)
    {
        var result = await _service.GetMatchesAsync(id, UserId);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("matches/{matchId:guid}/respond")]
    public async Task<IActionResult> Respond(Guid matchId, [FromBody] RespondMatchRequest body)
    {
        var result = await _service.RespondToMatchAsync(matchId, UserId, body.Accept);
        return result.Success ? Ok(result) : BadRequest(result);
    }
}
