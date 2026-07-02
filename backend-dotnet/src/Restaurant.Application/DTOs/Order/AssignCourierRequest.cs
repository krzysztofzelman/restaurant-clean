using System.ComponentModel.DataAnnotations;

namespace Restaurant.Application.DTOs.Order;

public class AssignCourierRequest
{
    [Required]
    public Guid CourierId { get; set; }
}
