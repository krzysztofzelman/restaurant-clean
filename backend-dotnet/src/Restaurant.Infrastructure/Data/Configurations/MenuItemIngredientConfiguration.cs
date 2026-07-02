using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Restaurant.Domain.Entities;

namespace Restaurant.Infrastructure.Data.Configurations;

public class MenuItemIngredientConfiguration : IEntityTypeConfiguration<MenuItemIngredient>
{
    public void Configure(EntityTypeBuilder<MenuItemIngredient> builder)
    {
        builder.ToTable("menu_item_ingredients");

        builder.HasKey(mii => mii.Id);

        builder.Property(mii => mii.MenuItemId)
            .HasColumnName("menu_item_id")
            .IsRequired();

        builder.Property(mii => mii.IngredientId)
            .HasColumnName("ingredient_id")
            .IsRequired();

        builder.Property(mii => mii.QuantityNeeded)
            .HasColumnName("quantity_needed")
            .HasColumnType("decimal")
            .IsRequired();

        builder.HasOne(mii => mii.MenuItem)
            .WithMany(m => m.MenuItemIngredients)
            .HasForeignKey(mii => mii.MenuItemId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(mii => mii.Ingredient)
            .WithMany(i => i.MenuItemIngredients)
            .HasForeignKey(mii => mii.IngredientId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
