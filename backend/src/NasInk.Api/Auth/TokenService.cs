using System.Security.Claims;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using NasInk.Domain.Users;

namespace NasInk.Api.Auth;

/// <summary>Nomi dei "claim", cioè le informazioni scritte dentro il token.</summary>
public static class AuthClaims
{
    public const string UserId = JwtRegisteredClaimNames.Sub;
    public const string TokenId = JwtRegisteredClaimNames.Jti;
    public const string Name = "name";
    public const string Role = "role";
    public const string ArtistId = "artistId";

    public static string? UserIdOf(ClaimsPrincipal user) => user.FindFirstValue(UserId);
}

/// <summary>Crea i token JWT firmati restituiti dal login.</summary>
public sealed class TokenService(IOptions<JwtOptions> options, TimeProvider clock)
{
    private readonly JsonWebTokenHandler _handler = new();

    public string CreateToken(User user)
    {
        var jwt = options.Value;
        var claims = new Dictionary<string, object>
        {
            [AuthClaims.UserId] = user.Id,
            // Id univoco del token: serve al logout per revocare proprio questo token.
            [AuthClaims.TokenId] = Guid.NewGuid().ToString(),
            [AuthClaims.Name] = user.Name,
            [AuthClaims.Role] = user.Role,
        };
        if (user.ArtistId is not null)
            claims[AuthClaims.ArtistId] = user.ArtistId;

        var now = clock.GetUtcNow().UtcDateTime;
        return _handler.CreateToken(
            new SecurityTokenDescriptor
            {
                Issuer = jwt.Issuer,
                Audience = jwt.Audience,
                Claims = claims,
                IssuedAt = now,
                NotBefore = now,
                Expires = now.AddHours(jwt.LifetimeHours),
                SigningCredentials = new SigningCredentials(
                    jwt.GetSecurityKey(),
                    SecurityAlgorithms.HmacSha256
                ),
            }
        );
    }
}
