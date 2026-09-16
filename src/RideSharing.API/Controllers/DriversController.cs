using System.Security.Claims;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideSharing.Application.DTOs.Drivers;
using RideSharing.Application.Interfaces;

namespace RideSharing.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
[Authorize(Roles = "Driver,Admin")]
public class DriversController : ControllerBase
{
    private readonly IDriverService _driverService;

    public DriversController(IDriverService driverService) => _driverService = driverService;

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("me")]
    public async Task<IActionResult> GetMyDriverProfile()
    {
        var result = await _driverService.GetMyDriverProfileAsync(GetUserId());
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpdateMyDriverProfile([FromBody] UpdateDriverProfileRequest request)
    {
        var result = await _driverService.UpsertMyDriverProfileAsync(GetUserId(), request);
        return result.Success ? Ok(result) : BadRequest(result);
    }
}
