using Asp.Versioning;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideSharing.Application.Common;
using RideSharing.Application.DTOs.Auth;
using RideSharing.Application.Interfaces;

namespace RideSharing.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IValidator<RegisterRequest> _registerValidator;
    private readonly IValidator<LoginRequest> _loginValidator;

    public AuthController(
        IAuthService authService,
        IValidator<RegisterRequest> registerValidator,
        IValidator<LoginRequest> loginValidator)
    {
        _authService = authService;
        _registerValidator = registerValidator;
        _loginValidator = loginValidator;
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var validation = await _registerValidator.ValidateAsync(request);
        if (!validation.IsValid)
            return BadRequest(ApiResponse<AuthResponse>.FailureResponse(
                "Validation failed.", validation.Errors.Select(e => e.ErrorMessage).ToList()));

        var result = await _authService.RegisterAsync(request, HttpContext.Connection.RemoteIpAddress?.ToString());
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var validation = await _loginValidator.ValidateAsync(request);
        if (!validation.IsValid)
            return BadRequest(ApiResponse<AuthResponse>.FailureResponse(
                "Validation failed.", validation.Errors.Select(e => e.ErrorMessage).ToList()));

        var result = await _authService.LoginAsync(request, HttpContext.Connection.RemoteIpAddress?.ToString());
        return result.Success ? Ok(result) : Unauthorized(result);
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest request)
    {
        var result = await _authService.RefreshTokenAsync(request, HttpContext.Connection.RemoteIpAddress?.ToString());
        return result.Success ? Ok(result) : Unauthorized(result);
    }

    [HttpPost("revoke")]
    [Authorize]
    public async Task<IActionResult> Revoke([FromBody] RefreshTokenRequest request)
    {
        var result = await _authService.RevokeTokenAsync(request.RefreshToken, HttpContext.Connection.RemoteIpAddress?.ToString());
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpGet("me")]
    [Authorize]
    public IActionResult Me()
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var email = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
        var roles = User.FindAll(System.Security.Claims.ClaimTypes.Role).Select(c => c.Value).ToList();
        return Ok(ApiResponse<object>.SuccessResponse(new { UserId = userId, Email = email, Roles = roles }));
    }

    [HttpGet("driver-only")]
    [Authorize(Roles = "Driver")]
    public IActionResult DriverOnly() =>
        Ok(ApiResponse.SuccessResponse("Driver access granted."));

    [HttpGet("admin-only")]
    [Authorize(Roles = "Admin")]
    public IActionResult AdminOnly() =>
        Ok(ApiResponse.SuccessResponse("Admin access granted."));
}
