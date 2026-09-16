using System.Security.Claims;
using Asp.Versioning;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideSharing.Application.Common;
using RideSharing.Application.DTOs.Vehicles;
using RideSharing.Application.Interfaces;

namespace RideSharing.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
[Authorize]
public class VehiclesController : ControllerBase
{
    private readonly IVehicleService _vehicleService;
    private readonly IValidator<CreateVehicleRequest> _createValidator;
    private readonly IValidator<UpdateVehicleRequest> _updateValidator;

    public VehiclesController(
        IVehicleService vehicleService,
        IValidator<CreateVehicleRequest> createValidator,
        IValidator<UpdateVehicleRequest> updateValidator)
    {
        _vehicleService = vehicleService;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private bool IsAdmin() => User.IsInRole("Admin");

    /// <summary>
    /// List my vehicles (or all if Admin and ?all=true).
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetVehicles([FromQuery] bool all = false)
    {
        if (all && IsAdmin())
        {
            var allResult = await _vehicleService.GetAllVehiclesAsync();
            return Ok(allResult);
        }

        var result = await _vehicleService.GetMyVehiclesAsync(GetUserId());
        return Ok(result);
    }

    [HttpGet("types")]
    [AllowAnonymous]
    public async Task<IActionResult> GetTypes()
    {
        var result = await _vehicleService.GetVehicleTypesAsync();
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _vehicleService.GetByIdAsync(id, GetUserId(), IsAdmin());
        if (!result.Success)
            return result.Message.Contains("not allowed") ? Forbid() : NotFound(result);
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "Driver,Admin")]
    public async Task<IActionResult> Create([FromBody] CreateVehicleRequest request)
    {
        var validation = await _createValidator.ValidateAsync(request);
        if (!validation.IsValid)
            return BadRequest(ApiResponse<VehicleDto>.FailureResponse(
                "Validation failed.", validation.Errors.Select(e => e.ErrorMessage).ToList()));

        var result = await _vehicleService.CreateAsync(GetUserId(), request);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Driver,Admin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateVehicleRequest request)
    {
        var validation = await _updateValidator.ValidateAsync(request);
        if (!validation.IsValid)
            return BadRequest(ApiResponse<VehicleDto>.FailureResponse(
                "Validation failed.", validation.Errors.Select(e => e.ErrorMessage).ToList()));

        var result = await _vehicleService.UpdateAsync(id, GetUserId(), IsAdmin(), request);
        if (!result.Success)
        {
            if (result.Message.Contains("not allowed")) return Forbid();
            if (result.Message.Contains("not found")) return NotFound(result);
            return BadRequest(result);
        }
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Driver,Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _vehicleService.DeleteAsync(id, GetUserId(), IsAdmin());
        if (!result.Success)
        {
            if (result.Message.Contains("not allowed")) return Forbid();
            if (result.Message.Contains("not found")) return NotFound(result);
            return BadRequest(result);
        }
        return Ok(result);
    }
}
