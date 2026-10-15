namespace NasInk.Domain.Requests;

// Richieste dei clienti, stessa forma di `CustomerRequest` in frontend/src/api/types.ts.
// Stato e origine restano stringhe come nel JSON; i valori ammessi sono nelle classi qui sotto.

public static class RequestStatus
{
    public const string Nuova = "nuova";
    public const string Consulenza = "consulenza";
    public const string Approvata = "approvata";
    public const string Chiusa = "chiusa";
}

public static class RequestSource
{
    /// <summary>Modulo pubblico del sito: non serve essere autenticati, servono recapito e consenso privacy.</summary>
    public const string Sito = "sito";
    /// <summary>Inserita dal gestionale da un utente autenticato.</summary>
    public const string Gestionale = "gestionale";
}

public static class RequestLimits
{
    public const int MaxReferenceImages = 3;
}

public sealed record Consultation(
    string Notes, string Subject, string Composition, string Style,
    string Position, string Size, string Colors, string ImageUrl)
{
    public static Consultation Empty { get; } = new("", "", "", "", "", "", "", "");
}

/// <param name="Status">"proposta" | "confermata"</param>
public sealed record ConsultationSlot(string ArtistId, string Date, string Start, string End, string Status);

public sealed class CustomerRequest
{
    public required string Id { get; set; }
    public required string Name { get; set; }
    /// <summary>Recapito in testo libero (sempre presente; per le richieste dal sito è "email · telefono").</summary>
    public required string Contact { get; set; }
    public required string Description { get; set; }
    public required string BodyArea { get; set; }
    public required string Size { get; set; }
    public required string Style { get; set; }
    public required string References { get; set; }
    public required string Status { get; set; }
    public required Consultation Consultation { get; set; }
    public ConsultationSlot? ConsultationSlot { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? PreferredArtistId { get; set; }
    /// <summary>URL delle immagini di riferimento, al massimo <see cref="RequestLimits.MaxReferenceImages"/>.</summary>
    public List<string> ReferenceImages { get; set; } = [];
    public string? Availability { get; set; }
    public required string Source { get; set; }
    public DateTimeOffset? CreatedAt { get; set; }
    /// <summary>Momento in cui il cliente ha accettato l'informativa (richieste dal sito).</summary>
    public DateTimeOffset? PrivacyConsentAt { get; set; }
}
