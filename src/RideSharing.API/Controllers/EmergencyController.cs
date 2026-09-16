using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideSharing.Application.DTOs.Emergency;
using RideSharing.Application.Interfaces;

namespace RideSharing.API.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/emergency")]
public class EmergencyController : ControllerBase
{
    private readonly IEmergencyService _svc;
    public EmergencyController(IEmergencyService svc) => _svc = svc;

    private Guid UserId => Guid.Parse(
        User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? User.FindFirstValue("sub")
        ?? throw new UnauthorizedAccessException());

    [HttpPost("sos")]
    public async Task<IActionResult> Sos([FromBody] ActivateSosRequest body, CancellationToken ct)
    {
        try
        {
            var dto = await _svc.ActivateSosAsync(UserId, body, ct);
            return Ok(new { success = true, data = dto, message = dto.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { success = false, message = ex.Message });
        }
    }

    [HttpGet("my")]
    public async Task<IActionResult> My(CancellationToken ct)
        => Ok(new { success = true, data = await _svc.GetMyAlertsAsync(UserId, ct) });

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var dto = await _svc.GetAsync(UserId, id, ct);
        return dto == null ? NotFound() : Ok(new { success = true, data = dto });
    }

    [HttpPost("{id:guid}/resolve")]
    public async Task<IActionResult> Resolve(Guid id, CancellationToken ct)
    {
        try { return Ok(new { success = true, data = await _svc.ResolveAsync(UserId, id, ct) }); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpGet("contacts")]
    public async Task<IActionResult> Contacts(CancellationToken ct)
        => Ok(new { success = true, data = await _svc.GetContactsAsync(UserId, ct) });

    [HttpPost("contacts")]
    public async Task<IActionResult> AddContact([FromBody] CreateEmergencyContactRequest body, CancellationToken ct)
        => Ok(new { success = true, data = await _svc.AddContactAsync(UserId, body, ct) });
}
