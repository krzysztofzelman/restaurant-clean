using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Restaurant.Domain.Entities;

namespace Restaurant.Infrastructure.Data.Configurations;

public class KonwersacjaConfiguration : IEntityTypeConfiguration<Konwersacja>
{
    public void Configure(EntityTypeBuilder<Konwersacja> builder)
    {
        builder.ToTable("konwersacje");

        builder.HasKey(k => k.Id);

        builder.Property(k => k.UserId)
            .HasColumnName("user_id")
            .IsRequired();

        builder.Property(k => k.Messages)
            .HasColumnName("messages")
            .HasColumnType("jsonb")
            .IsRequired()
            .HasDefaultValueSql("'[]'::jsonb");

        builder.Property(k => k.CreatedAt)
            .HasColumnName("created_at")
            .HasColumnType("timestamptz")
            .IsRequired()
            .HasDefaultValueSql("now()");

        builder.HasOne(k => k.User)
            .WithMany(u => u.Konwersacje)
            .HasForeignKey(k => k.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(k => k.UserId)
            .HasDatabaseName("idx_konwersacje_user_id");
    }
}
