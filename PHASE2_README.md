# Phase 2 — Authentication & Authorization

Built **on top of your Phase 1 project**. Your existing entities, Fluent configurations, connection string (LocalDB), and Swagger path (`/swagger`) were **not replaced**.

## What was ADDED (only)

### Backend (new files only)
- `Domain/Entities/RefreshToken.cs`
- `Persistence/Configurations/RefreshTokenConfiguration.cs`
- `Application/DTOs/Auth/*`
- `Application/Interfaces/IAuthService.cs`
- `Application/Validators/RegisterRequestValidator.cs`, `LoginRequestValidator.cs`
- `Infrastructure/Authentication/*` (JwtSettings, JwtTokenService, AuthService)
- `API/Controllers/AuthController.cs`

### Minimal edits to existing files
- `RideSharingDbContext.cs` — only added `DbSet<RefreshToken>`
- `Program.cs` — added JWT auth + service registration (your CORS, Swagger route, connection style kept)
- `appsettings.json` — JWT Secret set to a valid length (change for production)
- `Infrastructure.csproj` — added BCrypt.Net-Next + Persistence reference

### Your tables (unchanged)
Users, Roles, UserRoles, Institutions, VehicleTypes, Vehicles, Routes, RideSchedules

### New table after migration
RefreshTokens

## Commands (run on your machine)

```bash
cd RideSharingSystem

dotnet restore
dotnet build

# New migration for RefreshTokens only
dotnet ef migrations add AddRefreshTokens \
  --project src/RideSharing.Persistence \
  --startup-project src/RideSharing.API \
  --context RideSharingDbContext

dotnet ef database update \
  --project src/RideSharing.Persistence \
  --startup-project src/RideSharing.API \
  --context RideSharingDbContext

cd src/RideSharing.API
dotnet run
```

Swagger: `https://localhost:<port>/swagger`

## Test checklist

1. POST /api/v1/auth/register  (role: "Passenger" or "Driver")
2. POST /api/v1/auth/login
3. Click Authorize → Bearer {accessToken}
4. GET /api/v1/auth/me
5. GET /api/v1/auth/driver-only  (403 if Passenger, 200 if Driver)
6. POST /api/v1/auth/refresh
7. Unauthorized request without token → 401

## Password hashing
BCrypt (not plain text). Uses your existing `User.PasswordHash` column.

## Angular
Auth files are under `RideSharing.Web/src/app/core/` and `features/auth/`.
Wire them into your existing Angular app (routes + provideHttpClient with authInterceptor).
