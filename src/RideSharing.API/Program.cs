using Asp.Versioning;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using RideSharing.API.Extensions;
using RideSharing.API.Swagger;
using RideSharing.Application.Interfaces;
using RideSharing.Application.Options;
using RideSharing.Application.Validators;
using RideSharing.Infrastructure.Authentication;
using RideSharing.Infrastructure.Geo;
using RideSharing.Infrastructure.Matching;
using RideSharing.Infrastructure.Payment;
using RideSharing.Infrastructure.Services;
using RideSharing.Infrastructure.SignalR;
using RideSharing.Persistence.Context;
using Serilog;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .CreateLogger();

builder.Host.UseSerilog();

try
{
  Log.Information(
      "Starting RideSharing API - Phase 14 (Admin Dashboard and Reporting)");

  builder.Services.AddControllers();

  builder.Services.AddDbContext<RideSharingDbContext>(options =>
      options.UseSqlServer(
          builder.Configuration.GetConnectionString("DefaultConnection"),
          sqlOptions => sqlOptions.MigrationsAssembly(
              typeof(RideSharingDbContext).Assembly.FullName)));

  var jwtSection = builder.Configuration.GetSection("JwtSettings");
  builder.Services.Configure<JwtSettings>(jwtSection);
  var jwtSettings = jwtSection.Get<JwtSettings>()!;

  builder.Services
      .AddAuthentication(options =>
      {
        options.DefaultAuthenticateScheme =
              JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme =
              JwtBearerDefaults.AuthenticationScheme;
      })
      .AddJwtBearer(options =>
      {
        options.TokenValidationParameters =
              new TokenValidationParameters
              {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwtSettings.Issuer,
                ValidAudience = jwtSettings.Audience,
                IssuerSigningKey =
                      new SymmetricSecurityKey(
                          Encoding.UTF8.GetBytes(jwtSettings.Secret)),
                ClockSkew = TimeSpan.Zero
              };

        options.Events = new JwtBearerEvents
        {
          OnMessageReceived = context =>
          {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;

            if (!string.IsNullOrEmpty(accessToken) &&
                  path.StartsWithSegments("/hubs"))
            {
              context.Token = accessToken;
            }

            return Task.CompletedTask;
          }
        };
      });

  builder.Services.AddAuthorization();

  // ========== APPLICATION SERVICES ==========
  builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
  builder.Services.AddScoped<IAuthService, AuthService>();
  builder.Services.AddScoped<IUserService, UserService>();
  builder.Services.AddScoped<IDriverService, DriverService>();
  builder.Services.AddScoped<IVehicleService, VehicleService>();
  builder.Services.AddScoped<IRouteService, RouteService>();

  // Routing + geocoding
  builder.Services.AddHttpClient<IRoutingService, OsrmRoutingService>(client =>
  {
    client.BaseAddress = new Uri("https://router.project-osrm.org/");
    client.Timeout = TimeSpan.FromSeconds(20);
  });

  builder.Services.AddHttpClient<IGeocodingService, NominatimGeocodingService>(client =>
  {
    client.BaseAddress = new Uri("https://nominatim.openstreetmap.org/");
    client.DefaultRequestHeaders.UserAgent.ParseAdd("RideSharingApp/1.0 (FYP)");
    client.Timeout = TimeSpan.FromSeconds(20);
  });

  // Corridor matching → used by POST /ride-requests/{id}/match
  builder.Services.Configure<MatchingOptions>(
      builder.Configuration.GetSection("Matching"));
  builder.Services.AddScoped<IRideMatchingService, CorridorRideMatchingService>();
  builder.Services.AddScoped<IMatchingService, CorridorMatchingAdapter>();

  builder.Services.AddScoped<IRideRequestService, RideRequestService>();
  builder.Services.AddScoped<IRideService, RideService>();
  builder.Services.AddScoped<IRideRealtimeNotifier, RideRealtimeNotifier>();
  builder.Services.AddScoped<IChatService, ChatService>();
  builder.Services.AddScoped<INotificationService, NotificationService>();

  builder.Services.Configure<RideSharing.Application.DTOs.Payments.FareSettings>(
      builder.Configuration.GetSection("FareSettings"));
  builder.Services.AddScoped<IFareCalculator, FareCalculator>();
  builder.Services.AddScoped<IWalletService, WalletService>();
  builder.Services.AddScoped<IPaymentProvider, CashPaymentProvider>();
  builder.Services.AddScoped<IPaymentProvider, MockWalletPaymentProvider>();
  builder.Services.AddScoped<IPaymentService, PaymentService>();
  builder.Services.AddScoped<IRatingService, RatingService>();
  builder.Services.AddScoped<ISafetyService, SafetyService>();
  builder.Services.AddScoped<IVerificationService, VerificationService>();
  builder.Services.AddScoped<IAdminService, AdminService>();

  builder.Services.AddSignalR();
  builder.Services.AddHttpClient<IMapsService, GoogleMapsService>();
  builder.Services.AddScoped<ILocationService, LocationService>();
  builder.Services.AddValidatorsFromAssemblyContaining<RegisterRequestValidator>();

  builder.Services
      .AddApiVersioning(options =>
      {
        options.DefaultApiVersion = new ApiVersion(1, 0);
        options.AssumeDefaultVersionWhenUnspecified = true;
        options.ReportApiVersions = true;
        options.ApiVersionReader = ApiVersionReader.Combine(
              new UrlSegmentApiVersionReader(),
              new HeaderApiVersionReader("X-Api-Version"));
      })
      .AddApiExplorer(options =>
      {
        options.GroupNameFormat = "'v'VVV";
        options.SubstituteApiVersionInUrl = true;
      });

  builder.Services.AddEndpointsApiExplorer();
  builder.Services.AddSwaggerGen(options =>
  {
    options.OperationFilter<SwaggerFileOperationFilter>();
    options.SwaggerDoc("v1", new OpenApiInfo
    {
      Title = "Ride Sharing System API",
      Version = "v1",
      Description =
            "Real-time ride-sharing for daily repeat-route commuters in Pakistan. " +
            "Phase 14 – Admin Dashboard + corridor matching."
    });
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
      Description = "JWT Authorization header. Example: \"Bearer {token}\"",
      Name = "Authorization",
      In = ParameterLocation.Header,
      Type = SecuritySchemeType.ApiKey,
      Scheme = "Bearer"
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecurityScheme
                {
                    Reference = new OpenApiReference
                    {
                        Type = ReferenceType.SecurityScheme,
                        Id = "Bearer"
                    }
                },
                Array.Empty<string>()
            }
        });
  });

  builder.Services.AddCors(options =>
  {
    options.AddPolicy("AllowFrontend", policy =>
    {
      policy
          .WithOrigins(
              "http://localhost:4200",
              "https://localhost:4200",
              "http://localhost:8100",
              "https://localhost:8100",
              "http://192.168.10.16:4200",
              "https://192.168.10.16:4200"
          )
          .AllowAnyHeader()
          .AllowAnyMethod()
          .AllowCredentials();
    });
  });

  builder.Services
      .AddHealthChecks()
      .AddDbContextCheck<RideSharingDbContext>("database");

  var app = builder.Build();

  app.UseGlobalExceptionHandler();
  app.UseSwagger();
  app.UseSwaggerUI(options =>
  {
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "Ride Sharing API v1");
    options.RoutePrefix = "swagger";
  });
  app.UseSerilogRequestLogging();
  app.UseCors("AllowFrontend");
  app.UseAuthentication();
  app.UseAuthorization();
  app.UseStaticFiles();
  app.MapControllers();
  app.MapHub<RideHub>("/hubs/ride");
  app.MapHealthChecks("/health");

  Log.Information("RideSharing API is ready (corridor matching wired).");
  app.Run();
}
catch (Exception ex)
{
  Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
  Log.CloseAndFlush();
}
