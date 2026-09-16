using RideSharing.Application.Common;
using RideSharing.Application.DTOs.Verification;
using RideSharing.Domain.Enums;
using System.Xml.Linq;

namespace RideSharing.Application.Interfaces;

public interface IVerificationService
{
    Task<ApiResponse<MyVerificationStatusDto>> GetMyStatusAsync(Guid userId);
    Task<ApiResponse<VerificationRequestDto>> SubmitAsync(Guid userId, SubmitVerificationRequest request);
    Task<ApiResponse<DocumentMetaDto>> UploadDocumentAsync(Guid userId, Guid? requestId, DocumentType type, string fileName, string contentType, Stream content, long length);
    Task<ApiResponse<IReadOnlyList<VerificationRequestDto>>> AdminListAsync(string? statusFilter);
    Task<ApiResponse<VerificationRequestDto>> AdminGetAsync(Guid requestId);
    Task<ApiResponse<VerificationRequestDto>> AdminReviewAsync(Guid adminId, Guid requestId, AdminReviewRequest review);
    Task<(Stream? Stream, string? ContentType, string? FileName, string? Error)> DownloadDocumentAsync(Guid callerId, bool isAdmin, Guid documentId);
    Task<ApiResponse<IReadOnlyList<InstitutionListItemDto>>> ListInstitutionsAsync();
}
