using System.Security.Claims;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideSharing.Application.DTOs.Safety;
using RideSharing.Application.Interfaces;

namespace RideSharing.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/safety")]
[Authorize]
public class SafetyController : ControllerBase
{
    private readonly ISafetyService _safety;
    public SafetyController(ISafetyService safety) => _safety = safety;
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("settings")]
    public async Task<IActionResult> Settings() => Ok(await _safety.GetSettingsAsync(UserId));

    [HttpPut("settings")]
    public async Task<IActionResult> UpdateSettings([FromBody] UpdateSafetySettingsRequest body)
    {
        var r = await _safety.UpdateSettingsAsync(UserId, body);
        return r.Success ? Ok(r) : BadRequest(r);
    }

    [HttpGet("contacts")]
    public async Task<IActionResult> Contacts() => Ok(await _safety.GetContactsAsync(UserId));

    [HttpPost("contacts")]
    public async Task<IActionResult> AddContact([FromBody] UpsertEmergencyContactRequest body)
    {
        var r = await _safety.AddContactAsync(UserId, body);
        return r.Success ? Ok(r) : BadRequest(r);
    }

    [HttpDelete("contacts/{id:guid}")]
    public async Task<IActionResult> DeleteContact(Guid id)
    {
        var r = await _safety.DeleteContactAsync(UserId, id);
        return r.Success ? Ok(r) : BadRequest(r);
    }

    [HttpPost("sos")]
    public async Task<IActionResult> Sos([FromBody] TriggerSosRequest body)
    {
        var r = await _safety.TriggerSosAsync(UserId, body);
        return r.Success ? Ok(r) : BadRequest(r);
    }

    [HttpGet("alerts/ride/{rideId:guid}")]
    public async Task<IActionResult> RideAlerts(Guid rideId)
    {
        var r = await _safety.GetRideAlertsAsync(rideId, UserId);
        return r.Success ? Ok(r) : Forbid();
    }
}
