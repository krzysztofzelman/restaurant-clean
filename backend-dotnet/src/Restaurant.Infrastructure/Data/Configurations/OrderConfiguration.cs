using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Restaurant.Domain.Entities;

namespace Restaurant.Infrastructure.Data.Configurations;

public class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.ToTable("orders");

        builder.HasKey(o => o.Id);

        builder.Property(o => o.UserId)
            .HasColumnName("user_id")
            .IsRequired();

        builder.Property(o => o.Status)
            .HasColumnName("status")
            .HasConversion<string>()
            .HasColumnType("text")
            .IsRequired()
            .HasDefaultValue(Restaurant.Domain.Enums.OrderStatus.Pending);

        builder.Property(o => o.DeliveryStatus)
            .HasColumnName("delivery_status")
            .HasConversion<string>()
            .HasColumnType("text")
            .IsRequired()
            .HasDefaultValue(Restaurant.Domain.Enums.DeliveryStatus.Pending);

        builder.Property(o => o.TotalAmount)
            .HasColumnName("total_amount")
            .HasColumnType("decimal(10,2)")
            .IsRequired();

        builder.Property(o => o.PaymentStatus)
            .HasColumnName("payment_status")
            .HasConversion<string>()
            .HasColumnType("text")
            .IsRequired()
            .HasDefaultValue(Restaurant.Domain.Enums.PaymentStatus.Unpaid);

        builder.Property(o => o.DeliveryAddress)
            .HasColumnName("delivery_address")
            .HasColumnType("text");

        builder.Property(o => o.Notes)
            .HasColumnName("notes")
            .HasColumnType("text");

        builder.Property(o => o.CourierId)
            .HasColumnName("courier_id");

        builder.Property(o => o.CreatedAt)
            .HasColumnName("created_at")
            .HasColumnType("timestamptz")
            .IsRequired()
            .HasDefaultValueSql("now()");

        builder.HasOne(o => o.User)
            .WithMany(u => u.Orders)
            .HasForeignKey(o => o.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(o => o.Courier)
            .WithMany(u => u.CourierOrders)
            .HasForeignKey(o => o.CourierId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(o => o.UserId)
            .HasDatabaseName("idx_orders_user_id");

        builder.HasIndex(o => o.Status)
            .HasDatabaseName("idx_orders_status");

        builder.HasIndex(o => o.CreatedAt)
            .IsDescending()
            .HasDatabaseName("idx_orders_created_at");
    }
}
