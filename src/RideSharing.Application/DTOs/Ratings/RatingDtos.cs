namespace RideSharing.Application.DTOs.Ratings;

public class SubmitRatingRequest
{
    public Guid RideId { get; set; }
    public Guid ToUserId { get; set; }
    public int Stars { get; set; }
    public string? Review { get; set; }
}

public class RatingDto
{
    public Guid Id { get; set; }
    public Guid RideId { get; set; }
    public Guid FromUserId { get; set; }
    public Guid ToUserId { get; set; }
    public int Stars { get; set; }
    public string? Review { get; set; }
    public DateTime CreatedAt { get; set; }
}
