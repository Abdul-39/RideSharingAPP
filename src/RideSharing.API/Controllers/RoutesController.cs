using System.Security.Claims;
using Asp.Versioning;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideSharing.Application.Common;
using RideSharing.Application.DTOs.Routes;
using RideSharing.Application.Interfaces;

namespace RideSharing.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
[Authorize]
public class RoutesController : ControllerBase
{
    private readonly IRouteService _routeService;
    private readonly IValidator<CreateRouteRequest> _createValidator;
    private readonly IValidator<UpdateRouteRequest> _updateValidator;

    public RoutesController(
        IRouteService routeService,
        IValidator<CreateRouteRequest> createValidator,
        IValidator<UpdateRouteRequest> updateValidator)
    {
        _routeService = routeService;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private bool IsAdmin() => User.IsInRole("Admin");

    /// <summary>Get current user's routes.</summary>
    [HttpGet("my")]
    public async Task<IActionResult> GetMyRoutes()
    {
        var result = await _routeService.GetMyRoutesAsync(GetUserId());
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _routeService.GetByIdAsync(id, GetUserId(), IsAdmin());
        if (!result.Success)
            return result.Message.Contains("not allowed") ? Forbid() : NotFound(result);
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRouteRequest request)
    {
        var validation = await _createValidator.ValidateAsync(request);
        if (!validation.IsValid)
            return BadRequest(ApiResponse<RouteDto>.FailureResponse(
                "Validation failed.", validation.Errors.Select(e => e.ErrorMessage).ToList()));

        var result = await _routeService.CreateAsync(GetUserId(), request);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateRouteRequest request)
    {
        var validation = await _updateValidator.ValidateAsync(request);
        if (!validation.IsValid)
            return BadRequest(ApiResponse<RouteDto>.FailureResponse(
                "Validation failed.", validation.Errors.Select(e => e.ErrorMessage).ToList()));

        var result = await _routeService.UpdateAsync(id, GetUserId(), IsAdmin(), request);
        if (!result.Success)
        {
            if (result.Message.Contains("not allowed")) return Forbid();
            if (result.Message.Contains("not found")) return NotFound(result);
            return BadRequest(result);
        }
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _routeService.DeleteAsync(id, GetUserId(), IsAdmin());
        if (!result.Success)
        {
            if (result.Message.Contains("not allowed")) return Forbid();
            if (result.Message.Contains("not found")) return NotFound(result);
            return BadRequest(result);
        }
        return Ok(result);
    }
}
