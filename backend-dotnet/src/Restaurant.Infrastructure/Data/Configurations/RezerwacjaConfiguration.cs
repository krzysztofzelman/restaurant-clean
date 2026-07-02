using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Restaurant.Domain.Entities;

namespace Restaurant.Infrastructure.Data.Configurations;

public class RezerwacjaConfiguration : IEntityTypeConfiguration<Rezerwacja>
{
    public void Configure(EntityTypeBuilder<Rezerwacja> builder)
    {
        builder.ToTable("rezerwacje");

        builder.HasKey(r => r.Id);

        builder.Property(r => r.UserId)
            .HasColumnName("user_id")
            .IsRequired();

        builder.Property(r => r.Date)
            .HasColumnName("date")
            .HasColumnType("date")
            .IsRequired();

        builder.Property(r => r.Time)
            .HasColumnName("time")
            .HasColumnType("time")
            .IsRequired();

        builder.Property(r => r.Guests)
            .HasColumnName("guests")
            .IsRequired();

        builder.Property(r => r.Status)
            .HasColumnName("status")
            .HasConversion<string>()
            .HasColumnType("text")
            .IsRequired()
            .HasDefaultValue(Restaurant.Domain.Enums.ReservationStatus.Pending);

        builder.Property(r => r.Notes)
            .HasColumnName("notes")
            .HasColumnType("text");

        builder.Property(r => r.CreatedAt)
            .HasColumnName("created_at")
            .HasColumnType("timestamptz")
            .IsRequired()
            .HasDefaultValueSql("now()");

        builder.HasOne(r => r.User)
            .WithMany(u => u.Rezerwacje)
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(r => r.UserId)
            .HasDatabaseName("idx_rezerwacje_user_id");

        builder.HasIndex(r => new { r.Date, r.Time })
            .HasDatabaseName("idx_rezerwacje_date_time");
    }
}
