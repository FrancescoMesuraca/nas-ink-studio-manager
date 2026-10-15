using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace NasInk.Api.Auth;

/// <summary>Impostazioni dei token, dalla sezione "Jwt" della configurazione.</summary>
public sealed class JwtOptions
{
    public string Issuer { get; set; } = "nasink-api";
    public string Audience { get; set; } = "nasink-frontend";
    /// <summary>
    /// Chiave segreta con cui il server firma i token: chi la conosce può creare token validi.
    /// In sviluppo è in appsettings.Development.json; in produzione va in un segreto (variabile
    /// d'ambiente Jwt__SigningKey), lunga almeno 32 caratteri.
    /// </summary>
    public string SigningKey { get; set; } = "";
    /// <summary>Dopo quante ore il token scade e bisogna rifare il login.</summary>
    public int LifetimeHours { get; set; } = 8;

    public SymmetricSecurityKey GetSecurityKey()
    {
        if (Encoding.UTF8.GetByteCount(SigningKey) < 32)
            throw new InvalidOperationException("Configura Jwt:SigningKey con almeno 32 caratteri.");
        return new SymmetricSecurityKey(Encoding.UTF8.GetBytes(SigningKey));
    }
}
