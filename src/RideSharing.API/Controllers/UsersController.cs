using System.Security.Claims;
using Asp.Versioning;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideSharing.Application.Common;
using RideSharing.Application.DTOs.Users;
using RideSharing.Application.Interfaces;

namespace RideSharing.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly IValidator<UpdateProfileRequest> _updateValidator;
    private readonly IWebHostEnvironment _env;

    public UsersController(
        IUserService userService,
        IValidator<UpdateProfileRequest> updateValidator,
        IWebHostEnvironment env)
    {
        _userService = userService;
        _updateValidator = updateValidator;
        _env = env;
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var result = await _userService.GetMyProfileAsync(GetUserId());
        return result.Success ? Ok(result) : NotFound(result);
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateProfileRequest request)
    {
        var validation = await _updateValidator.ValidateAsync(request);
        if (!validation.IsValid)
            return BadRequest(ApiResponse<UserProfileDto>.FailureResponse(
                "Validation failed.", validation.Errors.Select(e => e.ErrorMessage).ToList()));

        var result = await _userService.UpdateMyProfileAsync(GetUserId(), request);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    /// <summary>
    /// Upload profile image (multipart/form-data, field name: file).
    /// </summary>
    [HttpPost("profile-image")]
    [RequestSizeLimit(5_000_000)]
    public async Task<IActionResult> UploadProfileImage(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(ApiResponse.FailureResponse("No file uploaded."));

        var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp" };
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowed.Contains(ext))
            return BadRequest(ApiResponse.FailureResponse("Only jpg, jpeg, png, webp allowed."));

        var uploads = Path.Combine(_env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot"), "uploads", "profiles");
        Directory.CreateDirectory(uploads);

        var fileName = $"{GetUserId()}_{DateTime.UtcNow:yyyyMMddHHmmss}{ext}";
        var path = Path.Combine(uploads, fileName);
        await using (var stream = System.IO.File.Create(path))
            await file.CopyToAsync(stream);

        var url = $"/uploads/profiles/{fileName}";
        var result = await _userService.UpdateProfileImageAsync(GetUserId(), url);
        return result.Success ? Ok(result) : BadRequest(result);
    }
}
