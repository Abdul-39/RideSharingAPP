using System.Security.Claims;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideSharing.Application.DTOs.Payments;
using RideSharing.Application.Interfaces;

namespace RideSharing.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/wallets")]
[Authorize]
public class WalletsController : ControllerBase
{
    private readonly IWalletService _wallets;
    public WalletsController(IWalletService wallets) => _wallets = wallets;
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("me")]
    public async Task<IActionResult> Me() => Ok(await _wallets.GetOrCreateAsync(UserId));

    [HttpPost("deposit")]
    public async Task<IActionResult> Deposit([FromBody] DepositRequest body)
    {
        var r = await _wallets.DepositAsync(UserId, body);
        return r.Success ? Ok(r) : BadRequest(r);
    }

    [HttpGet("transactions")]
    public async Task<IActionResult> Transactions([FromQuery] int take = 50)
        => Ok(await _wallets.GetTransactionsAsync(UserId, take));
}
