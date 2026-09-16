using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using RideSharing.Application.Common;
using RideSharing.Application.DTOs.Verification;
using RideSharing.Application.Interfaces;
using RideSharing.Domain.Entities;
using RideSharing.Domain.Enums;
using RideSharing.Persistence.Context;

namespace RideSharing.Infrastructure.Services;

public class VerificationService : IVerificationService
{
    private readonly RideSharingDbContext _db;
    private readonly IWebHostEnvironment _env;

    public VerificationService(RideSharingDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    public async Task<ApiResponse<MyVerificationStatusDto>> GetMyStatusAsync(Guid userId)
    {
        var user = await _db.Users.Include(u => u.Institution)
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);
        if (user == null) return ApiResponse<MyVerificationStatusDto>.FailureResponse("User not found.");

        var latest = await _db.VerificationRequests
            .Include(v => v.Documents)
            .Include(v => v.Institution)
            .Where(v => v.UserId == userId && !v.IsDeleted)
            .OrderByDescending(v => v.CreatedAt)
            .FirstOrDefaultAsync();

        return ApiResponse<MyVerificationStatusDto>.SuccessResponse(new MyVerificationStatusDto
        {
            IsVerified = user.IsVerified,
            CnicLast4 = user.CnicLast4,
            StudentOrEmployeeId = user.StudentOrEmployeeId,
            InstitutionId = user.InstitutionId,
            InstitutionName = user.Institution?.Name,
            LatestRequest = latest == null ? null : MapRequest(latest, canDownload: true)
        });
    }

    public async Task<ApiResponse<VerificationRequestDto>> SubmitAsync(Guid userId, SubmitVerificationRequest request)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);
        if (user == null) return ApiResponse<VerificationRequestDto>.FailureResponse("User not found.");

        var pending = await _db.VerificationRequests.AnyAsync(v =>
            v.UserId == userId && !v.IsDeleted &&
            (v.Status == VerificationRequestStatus.Pending || v.Status == VerificationRequestStatus.RequiresChanges));
        // Allow resubmit if RequiresChanges or create new always as new request
        var entity = new VerificationRequest
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Status = VerificationRequestStatus.Pending,
            StudentOrEmployeeId = request.StudentOrEmployeeId?.Trim(),
            InstitutionId = request.InstitutionId,
            ApplicantNote = request.ApplicantNote?.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        if (!string.IsNullOrWhiteSpace(request.Cnic))
        {
            var digits = new string(request.Cnic.Where(char.IsDigit).ToArray());
            if (digits.Length < 4)
                return ApiResponse<VerificationRequestDto>.FailureResponse("CNIC must contain at least 4 digits.");
            entity.CnicEncryptedOrPlain = digits; // FYP: plain; production should encrypt
            entity.CnicLast4 = digits[^4..];
            user.CnicLast4 = entity.CnicLast4;
        }

        if (!string.IsNullOrWhiteSpace(request.StudentOrEmployeeId))
            user.StudentOrEmployeeId = request.StudentOrEmployeeId.Trim();
        if (request.InstitutionId.HasValue)
            user.InstitutionId = request.InstitutionId;

        user.UpdatedAt = DateTime.UtcNow;
        _db.VerificationRequests.Add(entity);
        await _db.SaveChangesAsync();

        await _db.Entry(entity).Reference(v => v.Institution).LoadAsync();
        await _db.Entry(entity).Collection(v => v.Documents).LoadAsync();
        await _db.Entry(entity).Reference(v => v.User).LoadAsync();

        return ApiResponse<VerificationRequestDto>.SuccessResponse(MapRequest(entity, true), "Verification request submitted.");
    }

    public async Task<ApiResponse<DocumentMetaDto>> UploadDocumentAsync(
        Guid userId, Guid? requestId, DocumentType type, string fileName, string contentType, Stream content, long length)
    {
        if (length <= 0 || length > 5 * 1024 * 1024)
            return ApiResponse<DocumentMetaDto>.FailureResponse("File must be between 1 byte and 5 MB.");

        var allowed = new[] { "image/jpeg", "image/png", "image/webp", "application/pdf" };
        if (!allowed.Contains(contentType.ToLowerInvariant()))
            return ApiResponse<DocumentMetaDto>.FailureResponse("Only JPEG, PNG, WebP, or PDF allowed.");

        VerificationRequest? req = null;
        if (requestId.HasValue)
        {
            req = await _db.VerificationRequests.FirstOrDefaultAsync(v =>
                v.Id == requestId.Value && v.UserId == userId && !v.IsDeleted);
            if (req == null) return ApiResponse<DocumentMetaDto>.FailureResponse("Request not found.");
            if (req.Status is VerificationRequestStatus.Approved or VerificationRequestStatus.Rejected)
                return ApiResponse<DocumentMetaDto>.FailureResponse("Cannot upload to a closed request.");
        }
        else
        {
            req = await _db.VerificationRequests
                .Where(v => v.UserId == userId && !v.IsDeleted)
                .OrderByDescending(v => v.CreatedAt)
                .FirstOrDefaultAsync();
            if (req == null)
                return ApiResponse<DocumentMetaDto>.FailureResponse("Submit a verification request first.");
        }

        var root = Path.Combine(_env.ContentRootPath, "App_Data", "verification", userId.ToString("N"));
        Directory.CreateDirectory(root);
        var safeName = Path.GetFileName(fileName);
        var stored = $"{Guid.NewGuid():N}_{safeName}";
        var fullPath = Path.Combine(root, stored);
        await using (var fs = File.Create(fullPath))
            await content.CopyToAsync(fs);

        var doc = new DriverDocument
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            DocumentType = type,
            FileName = safeName,
            StoragePath = Path.Combine("App_Data", "verification", userId.ToString("N"), stored),
            ContentType = contentType,
            FileSizeBytes = length,
            Status = VerificationRequestStatus.Pending,
            VerificationRequestId = req.Id,
            CreatedAt = DateTime.UtcNow
        };
        _db.DriverDocuments.Add(doc);
        if (req.Status == VerificationRequestStatus.RequiresChanges)
            req.Status = VerificationRequestStatus.Pending;
        await _db.SaveChangesAsync();

        return ApiResponse<DocumentMetaDto>.SuccessResponse(MapDoc(doc, true), "Document uploaded.");
    }

    public async Task<ApiResponse<IReadOnlyList<VerificationRequestDto>>> AdminListAsync(string? statusFilter)
    {
        var q = _db.VerificationRequests.AsNoTracking()
            .Include(v => v.User)
            .Include(v => v.Institution)
            .Include(v => v.Documents)
            .Where(v => !v.IsDeleted);

        if (!string.IsNullOrWhiteSpace(statusFilter) &&
            Enum.TryParse<VerificationRequestStatus>(statusFilter, true, out var st))
            q = q.Where(v => v.Status == st);

        var list = await q.OrderByDescending(v => v.CreatedAt).Take(100).ToListAsync();
        return ApiResponse<IReadOnlyList<VerificationRequestDto>>.SuccessResponse(
            list.Select(v => MapRequest(v, true)).ToList());
    }

    public async Task<ApiResponse<VerificationRequestDto>> AdminGetAsync(Guid requestId)
    {
        var v = await _db.VerificationRequests.AsNoTracking()
            .Include(x => x.User)
            .Include(x => x.Institution)
            .Include(x => x.Documents)
            .FirstOrDefaultAsync(x => x.Id == requestId && !x.IsDeleted);
        if (v == null) return ApiResponse<VerificationRequestDto>.FailureResponse("Not found.");
        return ApiResponse<VerificationRequestDto>.SuccessResponse(MapRequest(v, true));
    }

    public async Task<ApiResponse<VerificationRequestDto>> AdminReviewAsync(Guid adminId, Guid requestId, AdminReviewRequest review)
    {
        var v = await _db.VerificationRequests
            .Include(x => x.User)
            .Include(x => x.Documents)
            .Include(x => x.Institution)
            .FirstOrDefaultAsync(x => x.Id == requestId && !x.IsDeleted);
        if (v == null) return ApiResponse<VerificationRequestDto>.FailureResponse("Not found.");

        var decision = (review.Decision ?? "").Trim();
        if (decision.Equals("Approved", StringComparison.OrdinalIgnoreCase))
        {
            v.Status = VerificationRequestStatus.Approved;
            v.User.IsVerified = true;
            if (v.User.InstitutionId == null && v.InstitutionId != null)
                v.User.InstitutionId = v.InstitutionId;
            foreach (var d in v.Documents)
                d.Status = VerificationRequestStatus.Approved;
            // driver profile
            var dp = await _db.DriverProfiles.FirstOrDefaultAsync(p => p.UserId == v.UserId);
            if (dp != null) dp.VerificationStatus = Domain.Enums.VerificationStatus.Verified;
        }
        else if (decision.Equals("Rejected", StringComparison.OrdinalIgnoreCase))
        {
            v.Status = VerificationRequestStatus.Rejected;
            foreach (var d in v.Documents)
                d.Status = VerificationRequestStatus.Rejected;
        }
        else if (decision.Equals("RequiresChanges", StringComparison.OrdinalIgnoreCase))
        {
            v.Status = VerificationRequestStatus.RequiresChanges;
        }
        else
            return ApiResponse<VerificationRequestDto>.FailureResponse("Decision must be Approved, Rejected, or RequiresChanges.");

        v.AdminNote = review.AdminNote?.Trim();
        v.ReviewedByAdminId = adminId;
        v.ReviewedAt = DateTime.UtcNow;
        v.UpdatedAt = DateTime.UtcNow;
        v.User.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return ApiResponse<VerificationRequestDto>.SuccessResponse(MapRequest(v, true), "Review saved.");
    }

    public async Task<(Stream? Stream, string? ContentType, string? FileName, string? Error)> DownloadDocumentAsync(
        Guid callerId, bool isAdmin, Guid documentId)
    {
        var doc = await _db.DriverDocuments.AsNoTracking()
            .FirstOrDefaultAsync(d => d.Id == documentId && !d.IsDeleted);
        if (doc == null) return (null, null, null, "Not found.");
        if (!isAdmin && doc.UserId != callerId) return (null, null, null, "Forbidden.");

        var full = Path.Combine(_env.ContentRootPath, doc.StoragePath);
        if (!File.Exists(full)) return (null, null, null, "File missing.");
        Stream stream = File.OpenRead(full);
        return (stream, doc.ContentType, doc.FileName, null);
    }

    public async Task<ApiResponse<IReadOnlyList<InstitutionListItemDto>>> ListInstitutionsAsync()
    {
        var list = await _db.Institutions.AsNoTracking()
            .Where(i => !i.IsDeleted)
            .OrderBy(i => i.Name)
            .Select(i => new InstitutionListItemDto
            {
                Id = i.Id,
                Name = i.Name,
                Type = i.Type.ToString()
            }).ToListAsync();
        return ApiResponse<IReadOnlyList<InstitutionListItemDto>>.SuccessResponse(list);
    }

    private static VerificationRequestDto MapRequest(VerificationRequest v, bool canDownload) => new()
    {
        Id = v.Id,
        UserId = v.UserId,
        UserName = v.User == null ? "" : $"{v.User.FirstName} {v.User.LastName}".Trim(),
        Email = v.User?.Email ?? "",
        Status = v.Status.ToString(),
        StudentOrEmployeeId = v.StudentOrEmployeeId,
        InstitutionId = v.InstitutionId,
        InstitutionName = v.Institution?.Name,
        CnicLast4 = v.CnicLast4,
        HasCnicOnFile = !string.IsNullOrEmpty(v.CnicEncryptedOrPlain),
        ApplicantNote = v.ApplicantNote,
        AdminNote = v.AdminNote,
        CreatedAt = v.CreatedAt,
        ReviewedAt = v.ReviewedAt,
        Documents = v.Documents?.Where(d => !d.IsDeleted).Select(d => MapDoc(d, canDownload)).ToList() ?? new()
    };

    private static DocumentMetaDto MapDoc(DriverDocument d, bool canDownload) => new()
    {
        Id = d.Id,
        DocumentType = d.DocumentType.ToString(),
        FileName = d.FileName,
        Status = d.Status.ToString(),
        FileSizeBytes = d.FileSizeBytes,
        CreatedAt = d.CreatedAt,
        CanDownload = canDownload
    };
}
