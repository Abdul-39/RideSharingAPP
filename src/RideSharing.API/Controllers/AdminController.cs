using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideSharing.Application.DTOs.Admin;
using RideSharing.Application.Interfaces;

namespace RideSharing.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/admin")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly IAdminService _admin;

    public AdminController(IAdminService admin) => _admin = admin;

    // Dashboard
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
        => Ok(await _admin.GetDashboardAsync());

    // Users
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers(
        [FromQuery] string? search,
        [FromQuery] string? role,
        [FromQuery] bool? isActive,
        [FromQuery] bool? isVerified,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortDir = null)
        => Ok(await _admin.GetUsersAsync(search, role, isActive, isVerified, page, pageSize, sortBy, sortDir));

    [HttpGet("users/{id:guid}")]
    public async Task<IActionResult> GetUser(Guid id)
    {
        var r = await _admin.GetUserByIdAsync(id);
        return r.Success ? Ok(r) : NotFound(r);
    }

    [HttpPut("users/{id:guid}/toggle-active")]
    public async Task<IActionResult> ToggleUserActive(Guid id, [FromBody] ToggleUserActiveRequest body)
    {
        var r = await _admin.ToggleUserActiveAsync(id, body.IsActive);
        return r.Success ? Ok(r) : BadRequest(r);
    }

    [HttpGet("users/{id:guid}/rides")]
    public async Task<IActionResult> GetUserRides(Guid id, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        => Ok(await _admin.GetUserRideHistoryAsync(id, page, pageSize));

    // Drivers
    [HttpGet("drivers")]
    public async Task<IActionResult> GetDrivers(
        [FromQuery] string? search,
        [FromQuery] string? verificationStatus,
        [FromQuery] bool? isActive,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortDir = null)
        => Ok(await _admin.GetDriversAsync(search, verificationStatus, isActive, page, pageSize, sortBy, sortDir));

    [HttpPut("drivers/{id:guid}/toggle-active")]
    public async Task<IActionResult> ToggleDriverActive(Guid id, [FromBody] ToggleUserActiveRequest body)
    {
        var r = await _admin.ToggleDriverActiveAsync(id, body.IsActive);
        return r.Success ? Ok(r) : BadRequest(r);
    }

    [HttpGet("drivers/{id:guid}/vehicles")]
    public async Task<IActionResult> GetDriverVehicles(Guid id)
    {
        var r = await _admin.GetDriverVehiclesAsync(id);
        return r.Success ? Ok(r) : NotFound(r);
    }

    // Institutions
    [HttpGet("institutions")]
    public async Task<IActionResult> GetInstitutions(
        [FromQuery] string? search,
        [FromQuery] string? verificationStatus,
        [FromQuery] bool? includeDeleted = false,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
        => Ok(await _admin.GetInstitutionsAsync(search, verificationStatus, includeDeleted, page, pageSize));

    [HttpGet("institutions/{id:guid}")]
    public async Task<IActionResult> GetInstitution(Guid id)
    {
        var r = await _admin.GetInstitutionByIdAsync(id);
        return r.Success ? Ok(r) : NotFound(r);
    }

    [HttpPost("institutions")]
    public async Task<IActionResult> CreateInstitution([FromBody] CreateInstitutionRequest body)
    {
        var r = await _admin.CreateInstitutionAsync(body);
        return r.Success ? Ok(r) : BadRequest(r);
    }

    [HttpPut("institutions/{id:guid}")]
    public async Task<IActionResult> UpdateInstitution(Guid id, [FromBody] UpdateInstitutionRequest body)
    {
        var r = await _admin.UpdateInstitutionAsync(id, body);
        return r.Success ? Ok(r) : BadRequest(r);
    }

    [HttpPost("institutions/{id:guid}/verify")]
    public async Task<IActionResult> VerifyInstitution(Guid id, [FromBody] VerifyInstitutionRequest body)
    {
        var r = await _admin.VerifyInstitutionAsync(id, body.VerificationStatus);
        return r.Success ? Ok(r) : BadRequest(r);
    }

    [HttpPost("institutions/{id:guid}/deactivate")]
    public async Task<IActionResult> DeactivateInstitution(Guid id)
    {
        var r = await _admin.DeactivateInstitutionAsync(id);
        return r.Success ? Ok(r) : BadRequest(r);
    }

    [HttpPost("institutions/{id:guid}/restore")]
    public async Task<IActionResult> RestoreInstitution(Guid id)
    {
        var r = await _admin.RestoreInstitutionAsync(id);
        return r.Success ? Ok(r) : BadRequest(r);
    }

    // Reports
    [HttpGet("reports/rides")]
    public async Task<IActionResult> GetRideReports(
        [FromQuery] string? from,
        [FromQuery] string? to,
        [FromQuery] string? granularity)
    {
        DateOnly? fromDate = null;
        DateOnly? toDate = null;
        if (!string.IsNullOrWhiteSpace(from) && DateOnly.TryParse(from, out var f)) fromDate = f;
        if (!string.IsNullOrWhiteSpace(to) && DateOnly.TryParse(to, out var t)) toDate = t;
        return Ok(await _admin.GetRideReportsAsync(fromDate, toDate, granularity));
    }

    [HttpGet("reports/payments")]
    public async Task<IActionResult> GetPaymentReports([FromQuery] string? from, [FromQuery] string? to)
    {
        DateOnly? fromDate = null;
        DateOnly? toDate = null;
        if (!string.IsNullOrWhiteSpace(from) && DateOnly.TryParse(from, out var f)) fromDate = f;
        if (!string.IsNullOrWhiteSpace(to) && DateOnly.TryParse(to, out var t)) toDate = t;
        return Ok(await _admin.GetPaymentReportsAsync(fromDate, toDate));
    }

    [HttpGet("reports/ratings")]
    public async Task<IActionResult> GetRatingReports()
        => Ok(await _admin.GetRatingReportsAsync());

    [HttpGet("reports/analytics")]
    public async Task<IActionResult> GetAnalytics([FromQuery] string? period)
        => Ok(await _admin.GetAnalyticsAsync(period));
}
