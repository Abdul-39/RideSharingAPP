using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using RideSharing.Application.Common;

namespace RideSharing.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public IActionResult Get()
    {
        var data = new
        {
            Status = "Healthy",
            Phase = "Phase 1 - Database & Domain Model",
            Timestamp = DateTime.UtcNow,
            Environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production",
            Version = "1.0"
        };

        return Ok(ApiResponse<object>.SuccessResponse(data, "RideSharing API is running"));
    }
}
