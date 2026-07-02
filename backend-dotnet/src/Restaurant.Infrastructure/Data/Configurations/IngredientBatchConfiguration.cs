using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Restaurant.Domain.Entities;

namespace Restaurant.Infrastructure.Data.Configurations;

public class IngredientBatchConfiguration : IEntityTypeConfiguration<IngredientBatch>
{
    public void Configure(EntityTypeBuilder<IngredientBatch> builder)
    {
        builder.ToTable("ingredient_batches");

        builder.HasKey(ib => ib.Id);

        builder.Property(ib => ib.IngredientId)
            .HasColumnName("ingredient_id")
            .IsRequired();

        builder.Property(ib => ib.Quantity)
            .HasColumnName("quantity")
            .HasColumnType("decimal")
            .IsRequired();

        builder.Property(ib => ib.CostPerUnit)
            .HasColumnName("cost_per_unit")
            .HasColumnType("decimal");

        builder.Property(ib => ib.ReceivedAt)
            .HasColumnName("received_at")
            .HasColumnType("timestamptz")
            .IsRequired()
            .HasDefaultValueSql("now()");

        builder.Property(ib => ib.ExpiresAt)
            .HasColumnName("expires_at")
            .HasColumnType("timestamptz");

        builder.Property(ib => ib.CreatedAt)
            .HasColumnName("created_at")
            .HasColumnType("timestamptz")
            .IsRequired()
            .HasDefaultValueSql("now()");

        builder.HasOne(ib => ib.Ingredient)
            .WithMany(i => i.Batches)
            .HasForeignKey(ib => ib.IngredientId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
