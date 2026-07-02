using System.Text.Json;

namespace Restaurant.Domain.Entities;

public class Konwersacja
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public JsonDocument Messages { get; set; } = JsonDocument.Parse("[]");
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}
