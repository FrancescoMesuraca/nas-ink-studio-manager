using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using NasInk.Api.Data;
using NasInk.Api.Errors;
using NasInk.Domain.Users;

namespace NasInk.Api.Auth;

// Endpoint dell'autenticazione (frontend/src/api/auth/authApi.http.ts).
//
//   POST /auth/login    { email, password } → Session { token, user }   400 se mancano i dati, 401 se errati
//   POST /auth/logout   revoca il token corrente (204)                   autenticato
//   GET  /auth/me       → User                                           401 se il token non è valido
public static class AuthEndpoints
{
    private const string LoginPolicy = "login";

    public sealed record LoginInput(string? Email, string? Password);
    /// <summary>Utente come lo vede il frontend (`User`): senza hash della password.</summary>
    public sealed record UserDto(string Id, string Name, string Email, string Role, string? ArtistId)
    {
        public static UserDto From(User user) => new(user.Id, user.Name, user.Email, user.Role, user.ArtistId);
    }
    public sealed record SessionDto(string Token, UserDto User);

    /// <summary>Registra JWT, controllo dei token revocati, hash delle password e anti-forza bruta sul login.</summary>
    public static IServiceCollection AddNasInkAuth(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<JwtOptions>(configuration.GetSection("Jwt"));
        services.AddSingleton<TokenService>();
        services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
        // Configurato a parte per poter leggere JwtOptions dalla configurazione già pronta.
        services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
            .Configure<IOptions<JwtOptions>>((bearer, jwtOptions) =>
            {
                var jwt = jwtOptions.Value;
                // Teniamo i nomi dei claim così come sono nel token ("sub", "role"…).
                bearer.MapInboundClaims = false;
                bearer.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidIssuer = jwt.Issuer,
                    ValidAudience = jwt.Audience,
                    IssuerSigningKey = jwt.GetSecurityKey(),
                    NameClaimType = AuthClaims.Name,
                    RoleClaimType = AuthClaims.Role,
                    ClockSkew = TimeSpan.FromMinutes(1),
                };
                // Un token firmato correttamente ma revocato con il logout non vale più.
                bearer.Events = new JwtBearerEvents
                {
                    OnTokenValidated = async context =>
                    {
                        var tokenId = context.Principal?.FindFirst(AuthClaims.TokenId)?.Value;
                        var db = context.HttpContext.RequestServices.GetRequiredService<NasInkDbContext>();
                        if (tokenId is null || await db.RevokedTokens.AnyAsync(token => token.TokenId == tokenId))
                            context.Fail("Token revocato.");
                    },
                };
            });

        services.AddAuthorizationBuilder()
            .AddPolicy(Roles.Titolare, policy => policy.RequireRole(Roles.Titolare));

        // Al massimo 10 tentativi di login ogni 5 minuti per indirizzo IP, contro chi prova password a caso.
        services.Configure<Microsoft.AspNetCore.RateLimiting.RateLimiterOptions>(options =>
            options.AddPolicy(LoginPolicy, context => RateLimitPartition.GetFixedWindowLimiter(
                context.Connection.RemoteIpAddress?.ToString() ?? "sconosciuto",
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = configuration.GetValue("RateLimiting:Login:PermitLimit", 10),
                    Window = TimeSpan.FromMinutes(5),
                })));

        return services;
    }

    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var auth = app.MapGroup("/auth").WithTags("Autenticazione");
        auth.MapPost("/login", Login).RequireRateLimiting(LoginPolicy);
        auth.MapPost("/logout", Logout).RequireAuthorization();
        auth.MapGet("/me", Me).RequireAuthorization();
        return app;
    }

    private static async Task<SessionDto> Login(
        LoginInput input, NasInkDbContext db, IPasswordHasher<User> hasher, TokenService tokens, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(input.Email) || string.IsNullOrEmpty(input.Password))
            throw new ApiException(StatusCodes.Status400BadRequest, "Inserisci email e password.");

        var email = User.NormalizeEmail(input.Email);
        var user = await db.Users.SingleOrDefaultAsync(item => item.Email == email, cancellationToken);
        // Stesso messaggio per email sconosciuta e password sbagliata: non diciamo quali email esistono.
        if (user is null || hasher.VerifyHashedPassword(user, user.PasswordHash, input.Password) == PasswordVerificationResult.Failed)
            throw new ApiException(StatusCodes.Status401Unauthorized, "Email o password non corretti.");

        return new SessionDto(tokens.CreateToken(user), UserDto.From(user));
    }

    private static async Task<IResult> Logout(HttpContext context, NasInkDbContext db, TimeProvider clock, CancellationToken cancellationToken)
    {
        var tokenId = context.User.FindFirst(AuthClaims.TokenId)!.Value;
        var expiresAt = DateTimeOffset.FromUnixTimeSeconds(long.Parse(context.User.FindFirst("exp")!.Value));

        // Pulizia: i token già scaduti non servono più nella lista dei revocati.
        await db.RevokedTokens.Where(token => token.ExpiresAt < clock.GetUtcNow()).ExecuteDeleteAsync(cancellationToken);
        db.RevokedTokens.Add(new RevokedToken { TokenId = tokenId, ExpiresAt = expiresAt });
        await db.SaveChangesAsync(cancellationToken);
        return Results.NoContent();
    }

    private static async Task<UserDto> Me(HttpContext context, NasInkDbContext db, CancellationToken cancellationToken)
    {
        // Rileggiamo l'utente dal database: se nel frattempo è stato eliminato, la sessione non vale più.
        var userId = AuthClaims.UserIdOf(context.User);
        var user = await db.Users.AsNoTracking().SingleOrDefaultAsync(item => item.Id == userId, cancellationToken)
            ?? throw new ApiException(StatusCodes.Status401Unauthorized, "Sessione assente o scaduta. Accedi di nuovo.");
        return UserDto.From(user);
    }
}
