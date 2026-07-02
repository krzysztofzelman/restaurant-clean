using Restaurant.Domain.Enums;

namespace Restaurant.Domain.Entities;

public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.User;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Order> Orders { get; set; } = new List<Order>();
    public ICollection<Order> CourierOrders { get; set; } = new List<Order>();
    public ICollection<Rezerwacja> Rezerwacje { get; set; } = new List<Rezerwacja>();
    public ICollection<Konwersacja> Konwersacje { get; set; } = new List<Konwersacja>();
}
