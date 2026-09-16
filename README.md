# Ride Sharing System — Final Year Project

Real-time ride-sharing platform for **daily repeat-route commuters in Pakistan**.

## Phase 0 — Project Foundation (Current)

Clean Architecture solution + Angular 20 frontend shell.  
**No authentication, rides, matching, GPS, payments, or chat yet.**

---

### 1. Complete Folder Structure

```
RideSharingSystem/
├── RideSharing.sln
├── README.md
├── .gitignore
├── src/
│   ├── RideSharing.Domain/
│   │   ├── Common/BaseEntity.cs
│   │   ├── Entities/          (empty)
│   │   ├── Enums/             (empty)
│   │   ├── Interfaces/IRepository.cs, IUnitOfWork.cs
│   │   └── Exceptions/DomainException.cs
│   ├── RideSharing.Application/
│   │   ├── Common/ApiResponse.cs
│   │   ├── DTOs/ Commands/ Queries/ Interfaces/ Services/
│   │   ├── Validators/ Mappings/
│   ├── RideSharing.Infrastructure/
│   │   ├── Authentication/ SignalR/ Email/ SMS/ Payment/
│   │   ├── Repositories/ Services/
│   │   └── (IEmailService, ISmsService, IPaymentService placeholders)
│   ├── RideSharing.Persistence/
│   │   ├── Context/ Configurations/ Repositories/
│   │   ├── Migrations/ UnitOfWork/
│   └── RideSharing.API/
│       ├── Controllers/HealthController.cs
│       ├── Middleware/GlobalExceptionMiddleware.cs
│       ├── Extensions/MiddlewareExtensions.cs
│       ├── Program.cs
│       ├── appsettings.json
│       └── appsettings.Development.json
├── tests/
│   ├── RideSharing.Application.Tests/
│   └── RideSharing.API.Tests/
└── RideSharing.Web/                    ← Angular 20 frontend
    ├── src/
    │   ├── app/
    │   │   ├── core/          (services, guards, interceptors, models)
    │   │   ├── shared/        (components, directives, pipes)
    │   │   ├── features/
    │   │   │   ├── auth/
    │   │   │   ├── dashboard/ (professional landing shell)
    │   │   │   ├── profile/ rides/ routes/ vehicle/
    │   │   │   ├── payment/ wallet/ notifications/ chat/
    │   │   │   ├── gps/ settings/ admin/
    │   │   ├── app.ts / app.html / app.routes.ts
    │   ├── environments/
    │   └── styles.scss
    ├── angular.json
    └── package.json
```

### 2. Project Creation Commands (for reference)

```bash
dotnet new sln -n RideSharing
dotnet new classlib -n RideSharing.Domain -o src/RideSharing.Domain -f net8.0
dotnet new classlib -n RideSharing.Application -o src/RideSharing.Application -f net8.0
dotnet new classlib -n RideSharing.Infrastructure -o src/RideSharing.Infrastructure -f net8.0
dotnet new classlib -n RideSharing.Persistence -o src/RideSharing.Persistence -f net8.0
dotnet new webapi -n RideSharing.API -o src/RideSharing.API -f net8.0 --use-controllers
# + test projects
```

### 3. Project References (Clean Architecture)

```
API          → Application, Infrastructure, Persistence
Infrastructure → Application, Domain
Persistence  → Application, Domain
Application  → Domain
Domain       → (none)
```

### 4. Required NuGet Packages (already added)

- Microsoft.EntityFrameworkCore / SqlServer / Tools / Design (8.0.x)
- Microsoft.AspNetCore.Authentication.JwtBearer (8.0.x)
- System.IdentityModel.Tokens.Jwt
- AutoMapper.Extensions.Microsoft.DependencyInjection
- FluentValidation.DependencyInjectionExtensions
- Serilog.AspNetCore + Serilog.Sinks.Console
- Swashbuckle.AspNetCore
- Asp.Versioning.Mvc + Asp.Versioning.Mvc.ApiExplorer

### 5. Required npm Packages (frontend)

```bash
cd RideSharing.Web
npm install
# Angular 20 core packages are already in package.json
# Later: @angular/material, @ionic/angular, tailwindcss, @microsoft/signalr, etc.
```

### 6. Backend Configuration

- **Serilog** – console logging
- **CORS** – localhost:4200 & 8100
- **API Versioning** – URL segment + header (`X-Api-Version`)
- **Global Exception Middleware** – returns consistent `ApiResponse`
- **Swagger** – served at root in Development
- **User Secrets** (recommended for secrets):

```bash
cd src/RideSharing.API
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "YOUR_CONNECTION_STRING"
dotnet user-secrets set "JwtSettings:Secret" "YOUR_LONG_SECRET_KEY_AT_LEAST_32_CHARS"
```

Never commit real passwords or API keys.

### 7. Angular Configuration

- Standalone components
- Lazy-loaded feature routes
- Professional landing page (DashboardComponent)
- Placeholder auth route
- Environment files ready for API URL

### 8. How to Run Backend

```bash
cd src/RideSharing.API
dotnet restore
dotnet run
```

### 9. How to Run Frontend

```bash
cd RideSharing.Web
npm install          # if not already done
ng serve
# or: npm start
```

Open http://localhost:4200

### 10. Swagger URL

When the API is running in Development:

- Swagger UI: **https://localhost:<port>/**  (root)
- Health: **https://localhost:<port>/api/v1/health**
- Alternative health: **/health**

### 11. How to Verify Both Projects Work

**Backend**
1. `dotnet build` → 0 errors
2. `dotnet run`
3. Open Swagger → call `GET /api/v1/health`
4. Expected JSON with `"success": true` and Phase 0 message

**Frontend**
1. `ng serve` (or `npm start`)
2. Open http://localhost:4200
3. You should see the professional landing page with feature cards
4. Click “Login” → placeholder auth page appears
5. No console errors related to missing modules (after `npm install`)

---

**Phase 0 is complete.**  
The solution compiles successfully.  
No business features have been implemented.

Say **“Proceed to Phase 1”** when you are ready for Authentication & Identity.
