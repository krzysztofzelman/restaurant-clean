using Restaurant.Domain.Interfaces;

namespace Restaurant.Infrastructure.Services;

public class PasswordHasher : IPasswordHasher
{
    public string Hash(string password)
    {
        return BCrypt.Net.BCrypt.HashPassword(password);
    }

    public bool Verify(string plainText, string hashed)
    {
        return BCrypt.Net.BCrypt.Verify(plainText, hashed);
    }
}
