using Microsoft.EntityFrameworkCore;
using RideSharing.Application.Common;
using RideSharing.Application.DTOs.Admin;
using RideSharing.Application.Interfaces;
using RideSharing.Domain.Enums;
using RideSharing.Persistence.Context;

namespace RideSharing.Infrastructure.Services;

public class AdminService : IAdminService
{
    private readonly RideSharingDbContext _db;
    public AdminService(RideSharingDbContext db) => _db = db;

    // ---------- Dashboard ----------
    public async Task<ApiResponse<AdminDashboardDto>> GetDashboardAsync()
    {
        var totalUsers = await _db.Users.CountAsync();
        var activeUsers = await _db.Users.CountAsync(u => u.IsActive);
        // Roles
        var passengerRoleId = await _db.Roles.Where(r => r.Name == "Passenger").Select(r => r.Id).FirstOrDefaultAsync();
        var driverRoleId = await _db.Roles.Where(r => r.Name == "Driver").Select(r => r.Id).FirstOrDefaultAsync();

        int drivers = 0;
        int passengers = 0;
        if (driverRoleId != Guid.Empty)
            drivers = await _db.UserRoles.CountAsync(ur => ur.RoleId == driverRoleId);
        if (passengerRoleId != Guid.Empty)
            passengers = await _db.UserRoles.CountAsync(ur => ur.RoleId == passengerRoleId);

        var activeStatuses = new[] { RideStatus.Matched, RideStatus.Confirmed, RideStatus.DriverArriving, RideStatus.DriverArrived, RideStatus.InProgress };
        var activeRides = await _db.Rides.CountAsync(r => activeStatuses.Contains(r.Status));
        var completedRides = await _db.Rides.CountAsync(r => r.Status == RideStatus.Completed);
        var cancelledRides = await _db.Rides.CountAsync(r => r.Status == RideStatus.Cancelled);
        var totalRides = await _db.Rides.CountAsync();

        var revenue = await _db.Payments
            .Where(p => p.Status == PaymentStatus.Completed)
            .SumAsync(p => (decimal?)p.Amount) ?? 0m;

        var avgRating = await _db.Ratings.AnyAsync()
            ? await _db.Ratings.AverageAsync(r => (double)r.Stars)
            : 0.0;
        var totalRatings = await _db.Ratings.CountAsync();

        var pendingVerifications = await _db.VerificationRequests.CountAsync(v => v.Status == VerificationRequestStatus.Pending);
        var totalVerifications = await _db.VerificationRequests.CountAsync();

        var institutions = await _db.Institutions.CountAsync();
        var vehicles = await _db.Vehicles.CountAsync();
        var routes = await _db.Routes.CountAsync();
        var payments = await _db.Payments.CountAsync();

        var dto = new AdminDashboardDto
        {
            TotalUsers = totalUsers,
            ActiveUsers = activeUsers,
            Drivers = drivers,
            Passengers = passengers,
            ActiveRides = activeRides,
            CompletedRides = completedRides,
            CancelledRides = cancelledRides,
            TotalRides = totalRides,
            Revenue = revenue,
            AverageRating = Math.Round(avgRating, 2),
            TotalRatings = totalRatings,
            VerificationRequestsPending = pendingVerifications,
            VerificationRequestsTotal = totalVerifications,
            InstitutionsTotal = institutions,
            VehiclesTotal = vehicles,
            RoutesTotal = routes,
            PaymentsTotal = payments
        };
        return ApiResponse<AdminDashboardDto>.SuccessResponse(dto);
    }

    // ---------- Users ----------
    public async Task<ApiResponse<PaginatedResultDto<UserListItemDto>>> GetUsersAsync(
        string? search, string? role, bool? isActive, bool? isVerified,
        int page, int pageSize, string? sortBy, string? sortDir)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var query = _db.Users
            .Include(u => u.Institution)
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(u =>
                u.FirstName.ToLower().Contains(s) ||
                u.LastName.ToLower().Contains(s) ||
                (u.FirstName + " " + u.LastName).ToLower().Contains(s) ||
                u.Email.ToLower().Contains(s) ||
                (u.PhoneNumber != null && u.PhoneNumber.Contains(s)) ||
                (u.StudentOrEmployeeId != null && u.StudentOrEmployeeId.ToLower().Contains(s)));
        }
        if (isActive.HasValue)
            query = query.Where(u => u.IsActive == isActive.Value);
        if (isVerified.HasValue)
            query = query.Where(u => u.IsVerified == isVerified.Value);
        if (!string.IsNullOrWhiteSpace(role))
        {
            var rl = role.Trim();
            query = query.Where(u => u.UserRoles.Any(ur => ur.Role.Name == rl));
        }

        // Sorting
        var dirAsc = string.Equals(sortDir, "asc", StringComparison.OrdinalIgnoreCase);
        query = (sortBy?.ToLower()) switch
        {
            "email" => dirAsc ? query.OrderBy(u => u.Email) : query.OrderByDescending(u => u.Email),
            "name" => dirAsc ? query.OrderBy(u => u.FirstName).ThenBy(u => u.LastName) : query.OrderByDescending(u => u.FirstName).ThenByDescending(u => u.LastName),
            "created" or "createdat" => dirAsc ? query.OrderBy(u => u.CreatedAt) : query.OrderByDescending(u => u.CreatedAt),
            "rating" => dirAsc ? query.OrderBy(u => u.AverageRating) : query.OrderByDescending(u => u.AverageRating),
            _ => query.OrderByDescending(u => u.CreatedAt)
        };

        var total = await query.CountAsync();
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize)
            .Select(u => new UserListItemDto
            {
                Id = u.Id,
                FirstName = u.FirstName,
                LastName = u.LastName,
                Email = u.Email,
                PhoneNumber = u.PhoneNumber,
                Gender = u.Gender.ToString(),
                IsActive = u.IsActive,
                IsVerified = u.IsVerified,
                InstitutionId = u.InstitutionId,
                InstitutionName = u.Institution != null ? u.Institution.Name : null,
                Roles = u.UserRoles.Select(ur => ur.Role.Name).ToList(),
                AverageRating = u.AverageRating,
                RatingCount = u.RatingCount,
                IsFlaggedForReview = u.IsFlaggedForReview,
                CreatedAt = u.CreatedAt,
                ProfileImageUrl = u.ProfileImageUrl
            }).ToListAsync();

        var result = new PaginatedResultDto<UserListItemDto>
        {
            Items = items,
            TotalCount = total,
            Page = page,
            PageSize = pageSize
        };
        return ApiResponse<PaginatedResultDto<UserListItemDto>>.SuccessResponse(result);
    }

    public async Task<ApiResponse<UserDetailDto>> GetUserByIdAsync(Guid userId)
    {
        var user = await _db.Users
            .Include(u => u.Institution)
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
            return ApiResponse<UserDetailDto>.FailureResponse("User not found.");

        var vehicleCount = await _db.Vehicles.CountAsync(v => v.DriverId == userId);
        var routeCount = await _db.Routes.CountAsync(r => r.UserId == userId);
        var rideCount = await _db.RideParticipants.CountAsync(p => p.UserId == userId);

        var dto = new UserDetailDto
        {
            Id = user.Id,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email,
            PhoneNumber = user.PhoneNumber,
            Gender = user.Gender.ToString(),
            IsActive = user.IsActive,
            IsVerified = user.IsVerified,
            InstitutionId = user.InstitutionId,
            InstitutionName = user.Institution?.Name,
            Roles = user.UserRoles.Select(ur => ur.Role.Name).ToList(),
            AverageRating = user.AverageRating,
            RatingCount = user.RatingCount,
            IsFlaggedForReview = user.IsFlaggedForReview,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt,
            ProfileImageUrl = user.ProfileImageUrl,
            DateOfBirth = user.DateOfBirth,
            CnicLast4 = user.CnicLast4,
            StudentOrEmployeeId = user.StudentOrEmployeeId,
            WomenOnlyPreference = user.WomenOnlyPreference,
            VehicleCount = vehicleCount,
            RouteCount = routeCount,
            RideCount = rideCount
        };
        return ApiResponse<UserDetailDto>.SuccessResponse(dto);
    }

    public async Task<ApiResponse<UserDetailDto>> ToggleUserActiveAsync(Guid userId, bool isActive)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
            return ApiResponse<UserDetailDto>.FailureResponse("User not found.");
        user.IsActive = isActive;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return await GetUserByIdAsync(userId);
    }

    public async Task<ApiResponse<PaginatedResultDto<UserRideHistoryDto>>> GetUserRideHistoryAsync(Guid userId, int page, int pageSize)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);
        var exists = await _db.Users.AnyAsync(u => u.Id == userId);
        if (!exists)
            return ApiResponse<PaginatedResultDto<UserRideHistoryDto>>.FailureResponse("User not found.");

        var query = _db.RideParticipants
            .Where(p => p.UserId == userId && !p.IsDeleted)
            .Include(p => p.Ride).ThenInclude(r => r.Route)
            .OrderByDescending(p => p.Ride.CreatedAt)
            .AsQueryable();

        var total = await query.CountAsync();
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize)
            .Select(p => new UserRideHistoryDto
            {
                RideId = p.RideId,
                SourceAddress = p.Ride.Route.SourceAddress,
                DestinationAddress = p.Ride.Route.DestinationAddress,
                TravelDate = p.Ride.TravelDate,
                ScheduledDepartureTime = p.Ride.ScheduledDepartureTime.ToString(@"hh\:mm"),
                Status = p.Ride.Status.ToString(),
                Role = p.Role.ToString(),
                CreatedAt = p.Ride.CreatedAt,
                CompletedAt = p.Ride.CompletedAt,
                FareAmount = p.Ride.FareAmount
            }).ToListAsync();

        var result = new PaginatedResultDto<UserRideHistoryDto>
        {
            Items = items,
            TotalCount = total,
            Page = page,
            PageSize = pageSize
        };
        return ApiResponse<PaginatedResultDto<UserRideHistoryDto>>.SuccessResponse(result);
    }

    // ---------- Drivers ----------
    public async Task<ApiResponse<PaginatedResultDto<DriverListItemDto>>> GetDriversAsync(
        string? search, string? verificationStatus, bool? isActive,
        int page, int pageSize, string? sortBy, string? sortDir)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        // Get driver role id
        var driverRoleId = await _db.Roles.Where(r => r.Name == "Driver").Select(r => r.Id).FirstOrDefaultAsync();
        if (driverRoleId == Guid.Empty)
        {
            return ApiResponse<PaginatedResultDto<DriverListItemDto>>.SuccessResponse(new PaginatedResultDto<DriverListItemDto> { Items = new(), TotalCount = 0, Page = page, PageSize = pageSize });
        }

        var query = _db.Users
            .Where(u => u.UserRoles.Any(ur => ur.RoleId == driverRoleId))
            .Include(u => u.UserRoles)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(u =>
                u.FirstName.ToLower().Contains(s) ||
                u.LastName.ToLower().Contains(s) ||
                u.Email.ToLower().Contains(s) ||
                (u.PhoneNumber != null && u.PhoneNumber.Contains(s)));
        }
        if (isActive.HasValue)
            query = query.Where(u => u.IsActive == isActive.Value);

        // Need DriverProfiles for verificationStatus filter; we'll join in memory after fetching ids
        // For verificationStatus filtering, we need to post-filter via driverProfile
        List<Guid> filteredIds = new();
        if (!string.IsNullOrWhiteSpace(verificationStatus) && Enum.TryParse<VerificationStatus>(verificationStatus, true, out var vs))
        {
            var qIds = _db.DriverProfiles.Where(dp => dp.VerificationStatus == vs).Select(dp => dp.UserId);
            query = query.Where(u => qIds.Contains(u.Id));
        }

        var dirAsc = string.Equals(sortDir, "asc", StringComparison.OrdinalIgnoreCase);
        query = (sortBy?.ToLower()) switch
        {
            "name" => dirAsc ? query.OrderBy(u => u.FirstName) : query.OrderByDescending(u => u.FirstName),
            "email" => dirAsc ? query.OrderBy(u => u.Email) : query.OrderByDescending(u => u.Email),
            "created" => dirAsc ? query.OrderBy(u => u.CreatedAt) : query.OrderByDescending(u => u.CreatedAt),
            _ => query.OrderByDescending(u => u.CreatedAt)
        };

        var total = await query.CountAsync();
        var usersPage = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        var userIds = usersPage.Select(u => u.Id).ToList();

        var profiles = await _db.DriverProfiles.Where(dp => userIds.Contains(dp.UserId)).ToDictionaryAsync(dp => dp.UserId);
        var vehicleCounts = await _db.Vehicles.Where(v => userIds.Contains(v.DriverId) && !v.IsDeleted)
            .GroupBy(v => v.DriverId).Select(g => new { DriverId = g.Key, Count = g.Count() }).ToDictionaryAsync(x => x.DriverId, x => x.Count);

        var items = usersPage.Select(u =>
        {
            profiles.TryGetValue(u.Id, out var dp);
            vehicleCounts.TryGetValue(u.Id, out var vc);
            return new DriverListItemDto
            {
                UserId = u.Id,
                DriverProfileId = dp?.Id,
                FullName = $"{u.FirstName} {u.LastName}",
                Email = u.Email,
                PhoneNumber = u.PhoneNumber,
                IsActive = u.IsActive,
                VerificationStatus = dp?.VerificationStatus.ToString() ?? VerificationStatus.Pending.ToString(),
                IsAvailable = dp?.IsAvailable ?? true,
                YearsOfExperience = dp?.YearsOfExperience ?? 0,
                LicenseNumber = dp?.LicenseNumber,
                LicenseExpiryDate = dp?.LicenseExpiryDate,
                VehicleCount = vc,
                AverageRating = u.AverageRating,
                RatingCount = u.RatingCount,
                CreatedAt = u.CreatedAt
            };
        }).ToList();

        var result = new PaginatedResultDto<DriverListItemDto>
        {
            Items = items,
            TotalCount = total,
            Page = page,
            PageSize = pageSize
        };
        return ApiResponse<PaginatedResultDto<DriverListItemDto>>.SuccessResponse(result);
    }

    public async Task<ApiResponse<DriverListItemDto>> ToggleDriverActiveAsync(Guid userId, bool isActive)
    {
        var user = await _db.Users.Include(u => u.UserRoles).ThenInclude(ur => ur.Role).FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
            return ApiResponse<DriverListItemDto>.FailureResponse("User not found.");
        var isDriver = user.UserRoles.Any(ur => ur.Role.Name == "Driver" || ur.Role.Name == "Admin");
        if (!isDriver)
            return ApiResponse<DriverListItemDto>.FailureResponse("User is not a driver.");

        user.IsActive = isActive;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        // Return via GetDrivers filtering single user
        var profile = await _db.DriverProfiles.FirstOrDefaultAsync(dp => dp.UserId == userId);
        var vc = await _db.Vehicles.CountAsync(v => v.DriverId == userId && !v.IsDeleted);
        var dto = new DriverListItemDto
        {
            UserId = user.Id,
            DriverProfileId = profile?.Id,
            FullName = $"{user.FirstName} {user.LastName}",
            Email = user.Email,
            PhoneNumber = user.PhoneNumber,
            IsActive = user.IsActive,
            VerificationStatus = profile?.VerificationStatus.ToString() ?? VerificationStatus.Pending.ToString(),
            IsAvailable = profile?.IsAvailable ?? true,
            YearsOfExperience = profile?.YearsOfExperience ?? 0,
            LicenseNumber = profile?.LicenseNumber,
            LicenseExpiryDate = profile?.LicenseExpiryDate,
            VehicleCount = vc,
            AverageRating = user.AverageRating,
            RatingCount = user.RatingCount,
            CreatedAt = user.CreatedAt
        };
        return ApiResponse<DriverListItemDto>.SuccessResponse(dto);
    }

    public async Task<ApiResponse<List<DriverVehicleDto>>> GetDriverVehiclesAsync(Guid userId)
    {
        var exists = await _db.Users.AnyAsync(u => u.Id == userId);
        if (!exists)
            return ApiResponse<List<DriverVehicleDto>>.FailureResponse("User not found.");

        var vehicles = await _db.Vehicles
            .Include(v => v.VehicleType)
            .Where(v => v.DriverId == userId && !v.IsDeleted)
            .OrderByDescending(v => v.CreatedAt)
            .Select(v => new DriverVehicleDto
            {
                Id = v.Id,
                VehicleTypeId = v.VehicleTypeId,
                VehicleTypeName = v.VehicleType.Name,
                Make = v.Make,
                Model = v.Model,
                RegistrationNumber = v.RegistrationNumber,
                Color = v.Color,
                SeatingCapacity = v.SeatingCapacity,
                IsActive = v.IsActive,
                CreatedAt = v.CreatedAt
            }).ToListAsync();

        return ApiResponse<List<DriverVehicleDto>>.SuccessResponse(vehicles);
    }

    // ---------- Institutions ----------
    public async Task<ApiResponse<PaginatedResultDto<InstitutionDto>>> GetInstitutionsAsync(
        string? search, string? verificationStatus, bool? includeDeleted,
        int page, int pageSize)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _db.Institutions.AsQueryable();
        if (includeDeleted == true)
            query = query.IgnoreQueryFilters();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(i => i.Name.ToLower().Contains(s) || (i.Address != null && i.Address.ToLower().Contains(s)));
        }
        if (!string.IsNullOrWhiteSpace(verificationStatus) && Enum.TryParse<VerificationStatus>(verificationStatus, true, out var vs))
        {
            query = query.Where(i => i.VerificationStatus == vs);
        }
        else if (includeDeleted != true)
        {
            // by default exclude deleted; already filtered via HasQueryFilter
        }

        query = query.OrderByDescending(i => i.CreatedAt);

        var total = await query.CountAsync();
        var itemsRaw = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        var ids = itemsRaw.Select(i => i.Id).ToList();
        var userCounts = await _db.Users.Where(u => u.InstitutionId != null && ids.Contains(u.InstitutionId.Value))
            .GroupBy(u => u.InstitutionId!.Value).Select(g => new { Id = g.Key, Count = g.Count() }).ToDictionaryAsync(x => x.Id, x => x.Count);

        var items = itemsRaw.Select(i => new InstitutionDto
        {
            Id = i.Id,
            Name = i.Name,
            Type = i.Type.ToString(),
            TypeId = (int)i.Type,
            Address = i.Address,
            VerificationStatus = i.VerificationStatus.ToString(),
            VerificationStatusId = (int)i.VerificationStatus,
            IsDeleted = i.IsDeleted,
            UserCount = userCounts.TryGetValue(i.Id, out var c) ? c : 0,
            CreatedAt = i.CreatedAt,
            UpdatedAt = i.UpdatedAt
        }).ToList();

        var result = new PaginatedResultDto<InstitutionDto>
        {
            Items = items,
            TotalCount = total,
            Page = page,
            PageSize = pageSize
        };
        return ApiResponse<PaginatedResultDto<InstitutionDto>>.SuccessResponse(result);
    }

    public async Task<ApiResponse<InstitutionDto>> GetInstitutionByIdAsync(Guid id)
    {
        var inst = await _db.Institutions.IgnoreQueryFilters().FirstOrDefaultAsync(i => i.Id == id);
        if (inst == null)
            return ApiResponse<InstitutionDto>.FailureResponse("Institution not found.");
        var count = await _db.Users.CountAsync(u => u.InstitutionId == id);
        var dto = new InstitutionDto
        {
            Id = inst.Id,
            Name = inst.Name,
            Type = inst.Type.ToString(),
            TypeId = (int)inst.Type,
            Address = inst.Address,
            VerificationStatus = inst.VerificationStatus.ToString(),
            VerificationStatusId = (int)inst.VerificationStatus,
            IsDeleted = inst.IsDeleted,
            UserCount = count,
            CreatedAt = inst.CreatedAt,
            UpdatedAt = inst.UpdatedAt
        };
        return ApiResponse<InstitutionDto>.SuccessResponse(dto);
    }

    public async Task<ApiResponse<InstitutionDto>> CreateInstitutionAsync(CreateInstitutionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return ApiResponse<InstitutionDto>.FailureResponse("Name is required.");
        if (!Enum.IsDefined(typeof(InstitutionType), request.Type))
            return ApiResponse<InstitutionDto>.FailureResponse("Invalid institution type.");

        var exists = await _db.Institutions.IgnoreQueryFilters().AnyAsync(i => i.Name.ToLower() == request.Name.Trim().ToLower() && !i.IsDeleted);
        if (exists)
            return ApiResponse<InstitutionDto>.FailureResponse("Institution with same name already exists.");

        var entity = new Domain.Entities.Institution
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Type = (InstitutionType)request.Type,
            Address = request.Address?.Trim(),
            VerificationStatus = VerificationStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };
        _db.Institutions.Add(entity);
        await _db.SaveChangesAsync();
        return await GetInstitutionByIdAsync(entity.Id);
    }

    public async Task<ApiResponse<InstitutionDto>> UpdateInstitutionAsync(Guid id, UpdateInstitutionRequest request)
    {
        var inst = await _db.Institutions.IgnoreQueryFilters().FirstOrDefaultAsync(i => i.Id == id);
        if (inst == null)
            return ApiResponse<InstitutionDto>.FailureResponse("Institution not found.");
        if (inst.IsDeleted)
            return ApiResponse<InstitutionDto>.FailureResponse("Cannot edit a deactivated institution. Restore first.");
        if (string.IsNullOrWhiteSpace(request.Name))
            return ApiResponse<InstitutionDto>.FailureResponse("Name is required.");
        if (!Enum.IsDefined(typeof(InstitutionType), request.Type))
            return ApiResponse<InstitutionDto>.FailureResponse("Invalid institution type.");

        var dup = await _db.Institutions.AnyAsync(i => i.Id != id && !i.IsDeleted && i.Name.ToLower() == request.Name.Trim().ToLower());
        if (dup)
            return ApiResponse<InstitutionDto>.FailureResponse("Another institution with same name exists.");

        inst.Name = request.Name.Trim();
        inst.Type = (InstitutionType)request.Type;
        inst.Address = request.Address?.Trim();
        inst.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return await GetInstitutionByIdAsync(id);
    }

    public async Task<ApiResponse<InstitutionDto>> VerifyInstitutionAsync(Guid id, string verificationStatus)
    {
        var inst = await _db.Institutions.IgnoreQueryFilters().FirstOrDefaultAsync(i => i.Id == id);
        if (inst == null)
            return ApiResponse<InstitutionDto>.FailureResponse("Institution not found.");
        if (inst.IsDeleted)
            return ApiResponse<InstitutionDto>.FailureResponse("Cannot verify a deactivated institution. Restore first.");
        if (!Enum.TryParse<VerificationStatus>(verificationStatus, true, out var vs))
            return ApiResponse<InstitutionDto>.FailureResponse("Invalid verification status. Use Pending, Verified, Rejected.");
        inst.VerificationStatus = vs;
        inst.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return await GetInstitutionByIdAsync(id);
    }

    public async Task<ApiResponse> DeactivateInstitutionAsync(Guid id)
    {
        var inst = await _db.Institutions.FirstOrDefaultAsync(i => i.Id == id);
        if (inst == null)
            return ApiResponse.FailureResponse("Institution not found.");
        if (inst.IsDeleted)
            return ApiResponse.FailureResponse("Already deactivated.");
        inst.IsDeleted = true;
        inst.DeletedAt = DateTime.UtcNow;
        inst.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return ApiResponse.SuccessResponse("Institution deactivated.");
    }

    public async Task<ApiResponse> RestoreInstitutionAsync(Guid id)
    {
        var inst = await _db.Institutions.IgnoreQueryFilters().FirstOrDefaultAsync(i => i.Id == id);
        if (inst == null)
            return ApiResponse.FailureResponse("Institution not found.");
        if (!inst.IsDeleted)
            return ApiResponse.FailureResponse("Institution is already active.");
        inst.IsDeleted = false;
        inst.DeletedAt = null;
        inst.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return ApiResponse.SuccessResponse("Institution restored.");
    }

    // ---------- Ride Reports ----------
    public async Task<ApiResponse<RideReportsDto>> GetRideReportsAsync(DateOnly? from, DateOnly? to, string? granularity)
    {
        var now = DateOnly.FromDateTime(DateTime.UtcNow);
        var today = now;
        var last7 = now.AddDays(-6);
        var last30 = now.AddDays(-29);

        // Base query for date filtering
        IQueryable<Domain.Entities.Ride> baseQuery = _db.Rides.AsQueryable();
        if (from.HasValue)
            baseQuery = baseQuery.Where(r => r.TravelDate >= from.Value);
        if (to.HasValue)
            baseQuery = baseQuery.Where(r => r.TravelDate <= to.Value);

        var totalRides = await baseQuery.CountAsync();
        var dailyRides = await _db.Rides.CountAsync(r => r.TravelDate == today);
        var weeklyRides = await _db.Rides.CountAsync(r => r.TravelDate >= last7 && r.TravelDate <= today);
        var monthlyRides = await _db.Rides.CountAsync(r => r.TravelDate >= last30 && r.TravelDate <= today);
        var completedRides = await baseQuery.CountAsync(r => r.Status == RideStatus.Completed);
        var cancelledRides = await baseQuery.CountAsync(r => r.Status == RideStatus.Cancelled);
        var activeStatuses = new[] { RideStatus.Matched, RideStatus.Confirmed, RideStatus.DriverArriving, RideStatus.DriverArrived, RideStatus.InProgress };
        var activeRides = await baseQuery.CountAsync(r => activeStatuses.Contains(r.Status));

        // Popular routes: group by RouteId, then join Route for addresses
        var popularRoutes = await baseQuery
            .GroupBy(r => r.RouteId)
            .Select(g => new { RouteId = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(5)
            .ToListAsync();

        var routeIds = popularRoutes.Select(p => p.RouteId).ToList();
        var routes = await _db.Routes.Where(r => routeIds.Contains(r.Id)).ToDictionaryAsync(r => r.Id);

        // For revenue per route: need payments per ride? Use FareAmount fallback
        var rideIdsPerRoute = await _db.Rides.Where(r => routeIds.Contains(r.RouteId) && r.FareAmount != null)
            .GroupBy(r => r.RouteId).Select(g => new { RouteId = g.Key, Revenue = g.Sum(x => x.FareAmount ?? 0) }).ToDictionaryAsync(x => x.RouteId, x => x.Revenue);

        var popularDtos = popularRoutes.Select(p =>
        {
            routes.TryGetValue(p.RouteId, out var rt);
            rideIdsPerRoute.TryGetValue(p.RouteId, out var rev);
            return new PopularRouteDto
            {
                SourceAddress = rt?.SourceAddress ?? "Unknown",
                DestinationAddress = rt?.DestinationAddress ?? "Unknown",
                RideCount = p.Count,
                RouteUsageCount = p.Count,
                TotalRevenue = rev,
                SourceLatitude = rt?.SourceLatitude ?? 0,
                SourceLongitude = rt?.SourceLongitude ?? 0,
                DestinationLatitude = rt?.DestinationLatitude ?? 0,
                DestinationLongitude = rt?.DestinationLongitude ?? 0
            };
        }).ToList();

        // Daily trend: last 7 days if granularity daily/weekly, else monthly trend
        var dailyTrend = new List<DailyRideCountDto>();
        // Build last 7 days trend
        for (int i = 6; i >= 0; i--)
        {
            var d = now.AddDays(-i);
            var total = await _db.Rides.CountAsync(r => r.TravelDate == d);
            var completed = await _db.Rides.CountAsync(r => r.TravelDate == d && r.Status == RideStatus.Completed);
            var cancelled = await _db.Rides.CountAsync(r => r.TravelDate == d && r.Status == RideStatus.Cancelled);
            var active = await _db.Rides.CountAsync(r => r.TravelDate == d && activeStatuses.Contains(r.Status));
            dailyTrend.Add(new DailyRideCountDto
            {
                Date = d,
                Label = d.ToString("MMM dd"),
                Total = total,
                Completed = completed,
                Cancelled = cancelled,
                Active = active
            });
        }

        // Monthly trend: last 6 months aggregated by month of CreatedAt
        var monthlyTrend = new List<DailyRideCountDto>();
        for (int i = 5; i >= 0; i--)
        {
            var month = DateTime.UtcNow.AddMonths(-i);
            var monthStart = new DateOnly(month.Year, month.Month, 1);
            var monthEnd = monthStart.AddMonths(1).AddDays(-1);
            // Use CreatedAt month for created rides, but TravelDate month for travel-based report; use TravelDate
            var total = await _db.Rides.CountAsync(r => r.TravelDate >= monthStart && r.TravelDate <= monthEnd);
            var completed = await _db.Rides.CountAsync(r => r.TravelDate >= monthStart && r.TravelDate <= monthEnd && r.Status == RideStatus.Completed);
            var cancelled = await _db.Rides.CountAsync(r => r.TravelDate >= monthStart && r.TravelDate <= monthEnd && r.Status == RideStatus.Cancelled);
            var active = await _db.Rides.CountAsync(r => r.TravelDate >= monthStart && r.TravelDate <= monthEnd && activeStatuses.Contains(r.Status));
            monthlyTrend.Add(new DailyRideCountDto
            {
                Date = monthStart,
                Label = month.ToString("MMM yyyy"),
                Total = total,
                Completed = completed,
                Cancelled = cancelled,
                Active = active
            });
        }

        var dto = new RideReportsDto
        {
            TotalRides = totalRides,
            DailyRides = dailyRides,
            WeeklyRides = weeklyRides,
            MonthlyRides = monthlyRides,
            CompletedRides = completedRides,
            CancelledRides = cancelledRides,
            ActiveRides = activeRides,
            PopularRoutes = popularDtos,
            DailyTrend = dailyTrend,
            MonthlyTrend = monthlyTrend
        };
        return ApiResponse<RideReportsDto>.SuccessResponse(dto);
    }

    // ---------- Payment Reports ----------
    public async Task<ApiResponse<PaymentReportsDto>> GetPaymentReportsAsync(DateOnly? from, DateOnly? to)
    {
        IQueryable<Domain.Entities.Payment> query = _db.Payments.AsQueryable();
        // Apply date filter on CreatedAt if from/to supplied (convert DateOnly to DateTime)
        if (from.HasValue)
        {
            var fromDt = from.Value.ToDateTime(TimeOnly.MinValue);
            query = query.Where(p => p.CreatedAt >= fromDt);
        }
        if (to.HasValue)
        {
            var toDt = to.Value.ToDateTime(TimeOnly.MaxValue);
            query = query.Where(p => p.CreatedAt <= toDt);
        }

        var totalPayments = await query.CountAsync();
        var totalAmount = await query.SumAsync(p => (decimal?)p.Amount) ?? 0m;

        var cashQuery = query.Where(p => p.Method == PaymentMethodType.Cash);
        var walletQuery = query.Where(p => p.Method == PaymentMethodType.MockWallet);
        var cashCount = await cashQuery.CountAsync();
        var cashAmount = await cashQuery.SumAsync(p => (decimal?)p.Amount) ?? 0m;
        var walletCount = await walletQuery.CountAsync();
        var walletAmount = await walletQuery.SumAsync(p => (decimal?)p.Amount) ?? 0m;

        var completed = query.Where(p => p.Status == PaymentStatus.Completed);
        var failed = query.Where(p => p.Status == PaymentStatus.Failed);
        var refunded = query.Where(p => p.Status == PaymentStatus.Refunded);
        var pending = query.Where(p => p.Status == PaymentStatus.Pending || p.Status == PaymentStatus.Processing);

        var completedCount = await completed.CountAsync();
        var completedAmount = await completed.SumAsync(p => (decimal?)p.Amount) ?? 0m;
        var failedCount = await failed.CountAsync();
        var failedAmount = await failed.SumAsync(p => (decimal?)p.Amount) ?? 0m;
        var refundedCount = await refunded.CountAsync();
        var refundedAmount = await refunded.SumAsync(p => (decimal?)p.Amount) ?? 0m;
        var pendingCount = await pending.CountAsync();
        var pendingAmount = await pending.SumAsync(p => (decimal?)p.Amount) ?? 0m;

        // Daily trend last 7 days
        var dailyTrend = new List<DailyPaymentDto>();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        for (int i = 6; i >= 0; i--)
        {
            var d = today.AddDays(-i);
            var dayStart = d.ToDateTime(TimeOnly.MinValue);
            var dayEnd = d.ToDateTime(TimeOnly.MaxValue);
            var dayQuery = _db.Payments.Where(p => p.CreatedAt >= dayStart && p.CreatedAt <= dayEnd);
            if (from.HasValue)
            {
                // already filtered? but daily trend should reflect overall last 7 regardless of filter? Use filtered query for consistency
                // We'll use day-specific but keep filtered bounds
            }
            var count = await dayQuery.CountAsync();
            var amount = await dayQuery.SumAsync(p => (decimal?)p.Amount) ?? 0m;
            dailyTrend.Add(new DailyPaymentDto
            {
                Date = d,
                Label = d.ToString("MMM dd"),
                Count = count,
                Amount = amount
            });
        }

        var dto = new PaymentReportsDto
        {
            TotalPayments = totalPayments,
            TotalAmount = totalAmount,
            CashCount = cashCount,
            CashAmount = cashAmount,
            WalletCount = walletCount,
            WalletAmount = walletAmount,
            CompletedCount = completedCount,
            CompletedAmount = completedAmount,
            FailedCount = failedCount,
            FailedAmount = failedAmount,
            RefundedCount = refundedCount,
            RefundedAmount = refundedAmount,
            PendingCount = pendingCount,
            PendingAmount = pendingAmount,
            Currency = "PKR",
            DailyTrend = dailyTrend
        };
        return ApiResponse<PaymentReportsDto>.SuccessResponse(dto);
    }

    // ---------- Rating Reports ----------
    public async Task<ApiResponse<RatingReportsDto>> GetRatingReportsAsync()
    {
        var totalRatings = await _db.Ratings.CountAsync();
        var avg = totalRatings > 0 ? await _db.Ratings.AverageAsync(r => (double)r.Stars) : 0.0;

        var distribution = new Dictionary<string, int>();
        for (int star = 1; star <= 5; star++)
        {
            var cnt = await _db.Ratings.CountAsync(r => r.Stars == star);
            distribution[star.ToString()] = cnt;
        }

        // Low-rated users: AverageRating < 2.5 or IsFlagged
        var lowRated = await _db.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .Where(u => (u.AverageRating != null && u.AverageRating < 2.5m) || u.IsFlaggedForReview)
            .OrderBy(u => u.AverageRating)
            .Take(20)
            .Select(u => new LowRatedUserDto
            {
                UserId = u.Id,
                FullName = u.FirstName + " " + u.LastName,
                Email = u.Email,
                AverageRating = u.AverageRating,
                RatingCount = u.RatingCount,
                IsFlaggedForReview = u.IsFlaggedForReview,
                FlagReason = u.FlagReason,
                Roles = u.UserRoles.Select(ur => ur.Role.Name).ToList()
            }).ToListAsync();

        // Trend last 7 days
        var trend = new List<DailyRatingDto>();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        for (int i = 6; i >= 0; i--)
        {
            var d = today.AddDays(-i);
            var dayStart = d.ToDateTime(TimeOnly.MinValue);
            var dayEnd = d.ToDateTime(TimeOnly.MaxValue);
            var dayRatings = _db.Ratings.Where(r => r.CreatedAt >= dayStart && r.CreatedAt <= dayEnd);
            var cnt = await dayRatings.CountAsync();
            var avgDay = cnt > 0 ? await dayRatings.AverageAsync(r => (double)r.Stars) : 0;
            trend.Add(new DailyRatingDto
            {
                Date = d,
                Label = d.ToString("MMM dd"),
                Average = Math.Round(avgDay, 2),
                Count = cnt
            });
        }

        var dto = new RatingReportsDto
        {
            AverageRating = Math.Round(avg, 2),
            TotalRatings = totalRatings,
            RatingDistribution = distribution,
            LowRatedUsers = lowRated,
            Trend = trend
        };
        return ApiResponse<RatingReportsDto>.SuccessResponse(dto);
    }

    // ---------- Analytics ----------
    public async Task<ApiResponse<AnalyticsDto>> GetAnalyticsAsync(string? period)
    {
        var dto = new AnalyticsDto();

        // Users by day last 7 days (CreatedAt)
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        for (int i = 6; i >= 0; i--)
        {
            var d = today.AddDays(-i);
            var dayStart = d.ToDateTime(TimeOnly.MinValue);
            var dayEnd = d.ToDateTime(TimeOnly.MaxValue);
            var count = await _db.Users.CountAsync(u => u.CreatedAt >= dayStart && u.CreatedAt <= dayEnd);
            dto.UsersByDay.Add(new ChartPointDto { Label = d.ToString("MMM dd"), Value = count, Date = dayStart });
        }
        // Users by month last 6 months
        for (int i = 5; i >= 0; i--)
        {
            var month = DateTime.UtcNow.AddMonths(-i);
            var monthStart = new DateTime(month.Year, month.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var monthEnd = monthStart.AddMonths(1).AddTicks(-1);
            var count = await _db.Users.CountAsync(u => u.CreatedAt >= monthStart && u.CreatedAt <= monthEnd);
            dto.UsersByMonth.Add(new ChartPointDto { Label = month.ToString("MMM yyyy"), Value = count, Date = monthStart });
        }

        // Rides by day / month
        for (int i = 6; i >= 0; i--)
        {
            var d = today.AddDays(-i);
            var dayStart = d.ToDateTime(TimeOnly.MinValue);
            var dayEnd = d.ToDateTime(TimeOnly.MaxValue);
            var count = await _db.Rides.CountAsync(r => r.CreatedAt >= dayStart && r.CreatedAt <= dayEnd);
            dto.RidesByDay.Add(new ChartPointDto { Label = d.ToString("MMM dd"), Value = count, Date = dayStart });
        }
        for (int i = 5; i >= 0; i--)
        {
            var month = DateTime.UtcNow.AddMonths(-i);
            var monthStart = new DateTime(month.Year, month.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var monthEnd = monthStart.AddMonths(1).AddTicks(-1);
            var count = await _db.Rides.CountAsync(r => r.CreatedAt >= monthStart && r.CreatedAt <= monthEnd);
            dto.RidesByMonth.Add(new ChartPointDto { Label = month.ToString("MMM yyyy"), Value = count, Date = monthStart });
        }

        // Revenue by day / month (Completed payments)
        for (int i = 6; i >= 0; i--)
        {
            var d = today.AddDays(-i);
            var dayStart = d.ToDateTime(TimeOnly.MinValue);
            var dayEnd = d.ToDateTime(TimeOnly.MaxValue);
            var sum = await _db.Payments.Where(p => p.Status == PaymentStatus.Completed && p.CreatedAt >= dayStart && p.CreatedAt <= dayEnd).SumAsync(p => (decimal?)p.Amount) ?? 0m;
            dto.RevenueByDay.Add(new ChartPointDto { Label = d.ToString("MMM dd"), Value = (double)sum, Date = dayStart });
        }
        for (int i = 5; i >= 0; i--)
        {
            var month = DateTime.UtcNow.AddMonths(-i);
            var monthStart = new DateTime(month.Year, month.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var monthEnd = monthStart.AddMonths(1).AddTicks(-1);
            var sum = await _db.Payments.Where(p => p.Status == PaymentStatus.Completed && p.CreatedAt >= monthStart && p.CreatedAt <= monthEnd).SumAsync(p => (decimal?)p.Amount) ?? 0m;
            dto.RevenueByMonth.Add(new ChartPointDto { Label = month.ToString("MMM yyyy"), Value = (double)sum, Date = monthStart });
        }

        // Popular routes - top 5
        var popular = await _db.Rides.GroupBy(r => r.RouteId)
            .Select(g => new { RouteId = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count).Take(5).ToListAsync();
        var routeIds = popular.Select(p => p.RouteId).ToList();
        var routes = await _db.Routes.Where(r => routeIds.Contains(r.Id)).ToDictionaryAsync(r => r.Id);
        var revByRoute = await _db.Rides.Where(r => routeIds.Contains(r.RouteId) && r.FareAmount != null)
            .GroupBy(r => r.RouteId).Select(g => new { RouteId = g.Key, Rev = g.Sum(x => x.FareAmount ?? 0) }).ToDictionaryAsync(x => x.RouteId, x => x.Rev);

        foreach (var p in popular)
        {
            routes.TryGetValue(p.RouteId, out var rt);
            revByRoute.TryGetValue(p.RouteId, out var rev);
            dto.PopularRoutes.Add(new PopularRouteDto
            {
                SourceAddress = rt?.SourceAddress ?? "Unknown",
                DestinationAddress = rt?.DestinationAddress ?? "Unknown",
                RideCount = p.Count,
                RouteUsageCount = p.Count,
                TotalRevenue = rev,
                SourceLatitude = rt?.SourceLatitude ?? 0,
                SourceLongitude = rt?.SourceLongitude ?? 0,
                DestinationLatitude = rt?.DestinationLatitude ?? 0,
                DestinationLongitude = rt?.DestinationLongitude ?? 0
            });
        }

        // Aggregations for pie
        var ridesByStatus = await _db.Rides.GroupBy(r => r.Status).Select(g => new { Status = g.Key.ToString(), Count = g.Count() }).ToListAsync();
        foreach (var g in ridesByStatus)
            dto.RidesByStatus[g.Status] = g.Count;

        var paymentsByMethod = await _db.Payments.GroupBy(p => p.Method).Select(g => new { Method = g.Key.ToString(), Count = g.Count() }).ToListAsync();
        foreach (var g in paymentsByMethod)
            dto.PaymentsByMethod[g.Method] = g.Count;

        var paymentsByStatus = await _db.Payments.GroupBy(p => p.Status).Select(g => new { Status = g.Key.ToString(), Count = g.Count() }).ToListAsync();
        foreach (var g in paymentsByStatus)
            dto.PaymentsByStatus[g.Status] = g.Count;

        return ApiResponse<AnalyticsDto>.SuccessResponse(dto);
    }
}
