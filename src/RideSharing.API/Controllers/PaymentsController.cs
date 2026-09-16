using System.Security.Claims;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideSharing.Application.DTOs.Payments;
using RideSharing.Application.Interfaces;

namespace RideSharing.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/payments")]
[Authorize]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentService _payments;
    public PaymentsController(IPaymentService payments) => _payments = payments;
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("fare/{rideId:guid}")]
    public async Task<IActionResult> Estimate(Guid rideId)
    {
        var r = await _payments.EstimateFareAsync(rideId, UserId);
        return r.Success ? Ok(r) : BadRequest(r);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePaymentRequest body)
    {
        var r = await _payments.CreatePaymentAsync(UserId, body);
        return r.Success ? Ok(r) : BadRequest(r);
    }

    [HttpPost("{id:guid}/confirm-cash")]
    public async Task<IActionResult> ConfirmCash(Guid id)
    {
        var r = await _payments.ConfirmCashAsync(id, UserId);
        return r.Success ? Ok(r) : BadRequest(r);
    }

    [HttpGet("my")]
    public async Task<IActionResult> My() => Ok(await _payments.GetMyPaymentsAsync(UserId));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var r = await _payments.GetByIdAsync(id, UserId);
        return r.Success ? Ok(r) : BadRequest(r);
    }

    [HttpGet("ride/{rideId:guid}")]
    public async Task<IActionResult> ForRide(Guid rideId)
    {
        var r = await _payments.GetRidePaymentsAsync(rideId, UserId);
        return r.Success ? Ok(r) : BadRequest(r);
    }
}
