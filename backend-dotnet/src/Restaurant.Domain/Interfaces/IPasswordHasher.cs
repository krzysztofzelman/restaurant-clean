namespace Restaurant.Domain.Interfaces;

public interface IPasswordHasher
{
    string Hash(string password);
    bool Verify(string plainText, string hashed);
}
