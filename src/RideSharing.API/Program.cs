using System.Text;
using Asp.Versioning;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using RideSharing.API.Extensions;
using RideSharing.Application.Interfaces;
using RideSharing.Application.Validators;
using RideSharing.Infrastructure.Authentication;
using RideSharing.Infrastructure.Services;
using RideSharing.Infrastructure.Matching;
using RideSharing.Infrastructure.SignalR;
using RideSharing.Infrastructure.Payment;
using RideSharing.Persistence.Context;
using RideSharing.API.Swagger;
var builder = WebApplication.CreateBuilder(args);

//
// ============================================================
// SERILOG
// ============================================================
//
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .CreateLogger();

builder.Host.UseSerilog();

try
{
    Log.Information(
        "Starting RideSharing API - Phase 14 (Admin Dashboard and Reporting)");

    //
    // ========================================================
    // CONTROLLERS
    // ========================================================
    //
    builder.Services.AddControllers();

    //
    // ========================================================
    // DATABASE - SQL SERVER
    // ========================================================
    //
    builder.Services.AddDbContext<RideSharingDbContext>(options =>
        options.UseSqlServer(
            builder.Configuration.GetConnectionString("DefaultConnection"),
            sqlOptions => sqlOptions.MigrationsAssembly(
                typeof(RideSharingDbContext).Assembly.FullName)));

    //
    // ========================================================
    // JWT SETTINGS
    // ========================================================
    //
    var jwtSection = builder.Configuration.GetSection("JwtSettings");
    builder.Services.Configure<JwtSettings>(jwtSection);
    var jwtSettings = jwtSection.Get<JwtSettings>()!;

    //
    // ========================================================
    // AUTHENTICATION - JWT
    // ========================================================
    //
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
                            Encoding.UTF8.GetBytes(
                                jwtSettings.Secret)),
                    ClockSkew = TimeSpan.Zero
                };

            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    var accessToken =
                        context.Request.Query["access_token"];
                    var path =
                        context.HttpContext.Request.Path;

                    if (!string.IsNullOrEmpty(accessToken) &&
                        path.StartsWithSegments("/hubs"))
                    {
                        context.Token = accessToken;
                    }

                    return Task.CompletedTask;
                }
            };
        });

    //
    // ========================================================
    // AUTHORIZATION
    // ========================================================
    //
    builder.Services.AddAuthorization();

    //
    // ========================================================
    // APPLICATION SERVICES
    // ========================================================
    //
    builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
    builder.Services.AddScoped<IAuthService, AuthService>();
    builder.Services.AddScoped<IUserService, UserService>();
    builder.Services.AddScoped<IDriverService, DriverService>();
    builder.Services.AddScoped<IVehicleService, VehicleService>();
    builder.Services.AddScoped<IRouteService, RouteService>();
    builder.Services.AddScoped<
        IMatchingService,
        RideSharing.Infrastructure.Matching.MatchingService>();
    builder.Services.AddScoped<
        IRideRequestService,
        RideRequestService>();
    builder.Services.AddScoped<
        IRideService,
        RideService>();
    builder.Services.AddScoped<
        IRideRealtimeNotifier,
        RideRealtimeNotifier>();
    builder.Services.AddScoped<
        IChatService,
        ChatService>();
    builder.Services.AddScoped<
        INotificationService,
        NotificationService>();

    //
    // Fare settings
    //
    builder.Services.Configure<
        RideSharing.Application.DTOs.Payments.FareSettings>(
            builder.Configuration.GetSection("FareSettings"));

    builder.Services.AddScoped<
        IFareCalculator,
        RideSharing.Infrastructure.Payment.FareCalculator>();

    //
    // Wallet
    //
    builder.Services.AddScoped<
        IWalletService,
        WalletService>();

    //
    // Payment providers
    //
    builder.Services.AddScoped<
        IPaymentProvider,
        RideSharing.Infrastructure.Payment.CashPaymentProvider>();
    builder.Services.AddScoped<
        IPaymentProvider,
        RideSharing.Infrastructure.Payment.MockWalletPaymentProvider>();
    builder.Services.AddScoped<
        IPaymentService,
        PaymentService>();

    //
    // Rating
    //
    builder.Services.AddScoped<
        IRatingService,
        RatingService>();

    //
    // Safety
    //
    builder.Services.AddScoped<
        ISafetyService,
        SafetyService>();

    //
    // Phase 13 — Verification
    //
    builder.Services.AddScoped<
        IVerificationService,
        VerificationService>();

    //
    // Phase 14 — Admin Dashboard and Reporting
    //
    builder.Services.AddScoped<
        IAdminService,
        AdminService>();

    //
    // SignalR
    //
    builder.Services.AddSignalR();

    //
    // Google Maps
    //
    builder.Services.AddHttpClient<
        IMapsService,
        GoogleMapsService>();

    //
    // Location
    //
    builder.Services.AddScoped<
        ILocationService,
        LocationService>();

    //
    // FluentValidation
    //
    builder.Services.AddValidatorsFromAssemblyContaining<
        RegisterRequestValidator>();

    //
    // ========================================================
    // API VERSIONING
    // ========================================================
    //
    builder.Services
        .AddApiVersioning(options =>
        {
            options.DefaultApiVersion =
                new ApiVersion(1, 0);
            options.AssumeDefaultVersionWhenUnspecified =
                true;
            options.ReportApiVersions = true;
            options.ApiVersionReader =
                ApiVersionReader.Combine(
                    new UrlSegmentApiVersionReader(),
                    new HeaderApiVersionReader(
                        "X-Api-Version"));
        })
        .AddApiExplorer(options =>
        {
            options.GroupNameFormat = "'v'VVV";
            options.SubstituteApiVersionInUrl = true;
        });

    //
    // ========================================================
    // SWAGGER / OPENAPI
    // ========================================================
    //
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(options =>
    {
        options.OperationFilter<SwaggerFileOperationFilter>();
        options.SwaggerDoc(
            "v1",
            new OpenApiInfo
            {
                Title = "Ride Sharing System API",
                Version = "v1",
                Description =
                    "Real-time ride-sharing platform for " +
                    "daily repeat-route commuters in Pakistan. " +
                    "Phase 14 – Admin Dashboard and Reporting."
            });

        options.AddSecurityDefinition(
            "Bearer",
            new OpenApiSecurityScheme
            {
                Description =
                    "JWT Authorization header using the Bearer " +
                    "scheme. Example: \"Bearer {token}\"",
                Name = "Authorization",
                In = ParameterLocation.Header,
                Type = SecuritySchemeType.ApiKey,
                Scheme = "Bearer"
            });

        options.AddSecurityRequirement(
            new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecurityScheme
                    {
                        Reference =
                            new OpenApiReference
                            {
                                Type =
                                    ReferenceType.SecurityScheme,
                                Id = "Bearer"
                            }
                    },
                    Array.Empty<string>()
                }
            });
    });

    //
    // ========================================================
    // CORS
    // ========================================================
    //
    builder.Services.AddCors(options =>
    {
        options.AddPolicy(
            "AllowFrontend",
            policy =>
            {
                policy
                    .WithOrigins(
                        "http://localhost:4200",
                        "https://localhost:4200",
                        "http://localhost:8100",
                        "https://localhost:8100",
                        "http://192.168.10.14:4200",
                        "https://192.168.10.14:4200"
                    )
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                    .AllowCredentials();
            });
    });

    //
    // ========================================================
    // HEALTH CHECKS
    // ========================================================
    //
    builder.Services
        .AddHealthChecks()
        .AddDbContextCheck<RideSharingDbContext>(
            "database");

    var app = builder.Build();

    //
    // ========================================================
    // PIPELINE
    // ========================================================
    //
    app.UseGlobalExceptionHandler();

    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint(
            "/swagger/v1/swagger.json",
            "Ride Sharing API v1");
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

    Log.Information(
        "RideSharing API is ready " +
        "(Phase 14 – Admin Dashboard and Reporting).");

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(
        ex,
        "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}