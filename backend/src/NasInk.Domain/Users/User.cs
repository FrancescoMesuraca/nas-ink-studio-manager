namespace NasInk.Domain.Users;

public static class Roles
{
    /// <summary>Accesso completo: configurazione dello studio e sito compresi.</summary>
    public const string Titolare = "titolare";

    /// <summary>Agenda, lettini, richieste e schede; niente configurazione né sito.</summary>
    public const string Tatuatore = "tatuatore";
}

/// <summary>Utente del gestionale (titolare o tatuatore).</summary>
public sealed class User
{
    public required string Id { get; set; }
    public required string Name { get; set; }

    /// <summary>Sempre in minuscolo, così il login non dipende da maiuscole e minuscole.</summary>
    public required string Email { get; set; }

    /// <summary>Hash della password (mai la password in chiaro).</summary>
    public string PasswordHash { get; set; } = "";

    /// <summary>Vedi <see cref="Roles"/>.</summary>
    public required string Role { get; set; }

    /// <summary>Per i tatuatori: il loro profilo in agenda.</summary>
    public string? ArtistId { get; set; }

    public static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();
}
