using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Restaurant.Application.DTOs.Auth;
using Restaurant.Application.Interfaces;
using Restaurant.WebAPI.Extensions;

namespace Restaurant.WebAPI.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    /// <summary>Register a new user.</summary>
    [HttpPost("register")]
    public async Task<ActionResult<UserResponse>> Register(
        [FromBody] RegisterRequest request)
    {
        try
        {
            var user = await _authService.RegisterAsync(request);
            return Ok(user);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
    }

    /// <summary>Login and receive tokens. Access token in body, refresh token in httpOnly cookie.</summary>
    [HttpPost("login")]
    public async Task<ActionResult<TokenResponse>> Login(
        [FromBody] LoginRequest request)
    {
        try
        {
            var result = await _authService.LoginAsync(request);

            // Set refresh token as httpOnly cookie
            SetRefreshCookie(result.RefreshToken);

            return Ok(new
            {
                access_token = result.AccessToken,
                token_type = result.TokenType,
            });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }

    /// <summary>Refresh access token using the httpOnly cookie.</summary>
    [HttpPost("refresh")]
    public async Task<ActionResult> Refresh()
    {
        var refreshToken = Request.Cookies["restaurant_refresh_token"];

        try
        {
            var result = await _authService.RefreshTokenAsync(refreshToken);
            SetRefreshCookie(result.RefreshToken);

            return Ok(new
            {
                access_token = result.AccessToken,
                token_type = result.TokenType,
            });
        }
        catch (UnauthorizedAccessException)
        {
            ClearRefreshCookie();
            return Unauthorized(new { error = "Invalid or expired refresh token." });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>Logout — clears the refresh cookie.</summary>
    [HttpPost("logout")]
    public async Task<ActionResult> Logout()
    {
        await _authService.LogoutAsync();
        ClearRefreshCookie();
        return Ok(new { message = "Logged out successfully." });
    }

    /// <summary>Get the currently authenticated user's profile.</summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserResponse>> Me()
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(new { error = "Invalid token." });

        try
        {
            var user = await _authService.GetCurrentUserAsync(userId.Value);
            return Ok(user);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = "User not found." });
        }
    }

    /// <summary>Admin: list all users.</summary>
    [HttpGet("users")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<List<UserResponse>>> GetAllUsers()
    {
        var users = await _authService.GetAllUsersAsync();
        return Ok(users);
    }

    /// <summary>Admin: update a user's role.</summary>
    [HttpPut("users/{id:guid}/role")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<UserResponse>> UpdateUserRole(
        Guid id, [FromBody] RoleUpdateRequest request)
    {
        try
        {
            var user = await _authService.UpdateUserRoleAsync(id, request.Role);
            return Ok(user);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = "User not found." });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    private void SetRefreshCookie(string refreshToken)
    {
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Path = "/api/auth",
            MaxAge = TimeSpan.FromDays(7),
        };

        Response.Cookies.Append("restaurant_refresh_token", refreshToken, cookieOptions);
    }

    private void ClearRefreshCookie()
    {
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Path = "/api/auth",
            MaxAge = TimeSpan.Zero,
        };

        Response.Cookies.Append("restaurant_refresh_token", string.Empty, cookieOptions);
    }
}
