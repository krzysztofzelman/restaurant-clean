using System.ComponentModel.DataAnnotations;

namespace Restaurant.Application.DTOs.Order;

public class UpdatePaymentStatusRequest
{
    [Required]
    public string PaymentStatus { get; set; } = string.Empty;
}
