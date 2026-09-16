using System.Security.Claims;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideSharing.Application.Interfaces;

namespace RideSharing.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _svc;
    public NotificationsController(INotificationService svc) => _svc = svc;
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> GetMine([FromQuery] int take = 50)
        => Ok(await _svc.GetMyAsync(UserId, take));

    [HttpGet("unread-count")]
    public async Task<IActionResult> UnreadCount()
        => Ok(await _svc.GetUnreadCountAsync(UserId));

    [HttpPost("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id)
    {
        var r = await _svc.MarkReadAsync(UserId, id);
        return r.Success ? Ok(r) : NotFound(r);
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead()
        => Ok(await _svc.MarkAllReadAsync(UserId));
}
