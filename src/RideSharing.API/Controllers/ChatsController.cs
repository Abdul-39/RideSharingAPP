using System.Security.Claims;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideSharing.Application.DTOs.Chat;
using RideSharing.Application.Interfaces;

namespace RideSharing.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/chats")]
[Authorize]
public class ChatsController : ControllerBase
{
    private readonly IChatService _chat;
    public ChatsController(IChatService chat) => _chat = chat;
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> MyThreads() => Ok(await _chat.GetMyThreadsAsync(UserId));

    [HttpGet("{rideId:guid}")]
    public async Task<IActionResult> GetMessages(Guid rideId)
    {
        var r = await _chat.GetMessagesAsync(rideId, UserId);
        return r.Success ? Ok(r) : BadRequest(r);
    }

    [HttpPost("{rideId:guid}/messages")]
    public async Task<IActionResult> Send(Guid rideId, [FromBody] SendChatMessageRequest body)
    {
        var r = await _chat.SendAsync(rideId, UserId, body);
        return r.Success ? Ok(r) : BadRequest(r);
    }

    [HttpPost("{rideId:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid rideId)
    {
        var r = await _chat.MarkReadAsync(rideId, UserId);
        return r.Success ? Ok(r) : BadRequest(r);
    }
}
