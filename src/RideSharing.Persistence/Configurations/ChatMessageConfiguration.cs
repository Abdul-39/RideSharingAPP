using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RideSharing.Domain.Entities;

namespace RideSharing.Persistence.Configurations;

public class ChatMessageConfiguration : IEntityTypeConfiguration<ChatMessage>
{
    public void Configure(EntityTypeBuilder<ChatMessage> builder)
    {
        builder.ToTable("ChatMessages");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Message).HasMaxLength(2000).IsRequired();
        builder.HasIndex(x => x.RideId);
        builder.HasIndex(x => new { x.RideId, x.SentAt });
        builder.HasIndex(x => new { x.ReceiverId, x.IsRead });

        builder.HasOne(x => x.Ride).WithMany().HasForeignKey(x => x.RideId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(x => x.Sender).WithMany().HasForeignKey(x => x.SenderId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Receiver).WithMany().HasForeignKey(x => x.ReceiverId).OnDelete(DeleteBehavior.Restrict);
        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}
