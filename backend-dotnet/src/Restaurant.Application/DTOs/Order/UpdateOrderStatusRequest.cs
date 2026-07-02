using System.ComponentModel.DataAnnotations;

namespace Restaurant.Application.DTOs.Order;

public class UpdateOrderStatusRequest
{
    /// <summary>
    /// New status value. Valid transitions:
    /// pending → confirmed | cancelled
    /// confirmed → preparing | cancelled
    /// preparing → ready | cancelled
    /// ready → in_transit | cancelled
    /// in_transit → delivered | cancelled
    /// delivered (terminal)
    /// cancelled (terminal)
    /// </summary>
    [Required]
    public string Status { get; set; } = string.Empty;
}
