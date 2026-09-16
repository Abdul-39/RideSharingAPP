using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideSharing.Application.DTOs.Verification;
using RideSharing.Application.Interfaces;
using RideSharing.Domain.Enums;
using System.Security.Claims;

namespace RideSharing.API.Controllers;

[ApiController]
[Route("api/v{version:apiVersion}/verification")]
[ApiVersion("1.0")]
[Authorize]
public class VerificationController : ControllerBase
{
    private readonly IVerificationService _service;

    public VerificationController(IVerificationService service)
        => _service = service;

    private Guid UserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private bool IsAdmin =>
        User.IsInRole("Admin");

    [HttpGet("me")]
    public async Task<IActionResult> MyStatus()
        => Ok(await _service.GetMyStatusAsync(UserId));

    [HttpGet("institutions")]
    public async Task<IActionResult> Institutions()
        => Ok(await _service.ListInstitutionsAsync());

    [HttpPost("requests")]
    public async Task<IActionResult> Submit(
        [FromBody] SubmitVerificationRequest body)
        => Ok(await _service.SubmitAsync(UserId, body));

    [HttpPost("documents")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(6_000_000)]
    public async Task<IActionResult> Upload(
        IFormFile file,
        [FromForm] string documentType,
        [FromForm] Guid? requestId)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new
            {
                message = "File required."
            });
        }

        if (!Enum.TryParse<DocumentType>(
                documentType,
                true,
                out var type))
        {
            return BadRequest(new
            {
                message = "Invalid documentType."
            });
        }

        await using var stream = file.OpenReadStream();

        var result = await _service.UploadDocumentAsync(
            UserId,
            requestId,
            type,
            file.FileName,
            file.ContentType,
            stream,
            file.Length);

        return Ok(result);
    }

    [HttpGet("documents/{id:guid}/download")]
    public async Task<IActionResult> Download(Guid id)
    {
        var (stream, contentType, fileName, error) =
            await _service.DownloadDocumentAsync(
                UserId,
                IsAdmin,
                id);

        if (error != null)
        {
            return error == "Forbidden"
                ? Forbid()
                : NotFound(new { message = error });
        }

        return File(
            stream!,
            contentType ?? "application/octet-stream",
            fileName);
    }

    [HttpGet("admin/requests")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AdminList(
        [FromQuery] string? status)
        => Ok(await _service.AdminListAsync(status));

    [HttpGet("admin/requests/{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AdminGet(Guid id)
        => Ok(await _service.AdminGetAsync(id));

    [HttpPost("admin/requests/{id:guid}/review")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AdminReview(
        Guid id,
        [FromBody] AdminReviewRequest body)
        => Ok(await _service.AdminReviewAsync(
            UserId,
            id,
            body));
}