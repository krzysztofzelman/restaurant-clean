using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Restaurant.Domain.Entities;

namespace Restaurant.Infrastructure.Data.Configurations;

public class IngredientConfiguration : IEntityTypeConfiguration<Ingredient>
{
    public void Configure(EntityTypeBuilder<Ingredient> builder)
    {
        builder.ToTable("ingredients");

        builder.HasKey(i => i.Id);

        builder.Property(i => i.Name)
            .HasColumnName("name")
            .HasColumnType("text")
            .IsRequired();

        builder.Property(i => i.Unit)
            .HasColumnName("unit")
            .HasColumnType("text")
            .IsRequired();

        builder.Property(i => i.MinStock)
            .HasColumnName("min_stock")
            .HasColumnType("decimal")
            .IsRequired()
            .HasDefaultValue(0);

        builder.Property(i => i.Category)
            .HasColumnName("category")
            .HasColumnType("text");

        builder.Property(i => i.CreatedAt)
            .HasColumnName("created_at")
            .HasColumnType("timestamptz")
            .IsRequired()
            .HasDefaultValueSql("now()");
    }
}
