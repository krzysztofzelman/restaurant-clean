using System.ComponentModel.DataAnnotations;

namespace Restaurant.Application.DTOs.Order;

public class CreateOrderItemRequest
{
    [Required]
    public Guid MenuItemId { get; set; }

    [Required]
    [Range(1, 100)]
    public int Quantity { get; set; } = 1;
}

public class CreateOrderRequest
{
    [Required]
    [MinLength(1)]
    public List<CreateOrderItemRequest> Items { get; set; } = [];

    public string? DeliveryAddress { get; set; }

    public string? Notes { get; set; }
}
