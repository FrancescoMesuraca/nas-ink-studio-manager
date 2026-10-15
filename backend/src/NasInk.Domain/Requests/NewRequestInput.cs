using System.Text.RegularExpressions;

namespace NasInk.Domain.Requests;

/// <summary>
/// Dati per creare una richiesta (`NewRequestInput` nel frontend). Tutto è nullable perché arriva
/// da un client che non controlliamo: un campo mancante vale come stringa vuota.
/// </summary>
public sealed partial record NewRequestInput
{
    public string? Name { get; init; }
    public string? Contact { get; init; }
    public string? Email { get; init; }
    public string? Phone { get; init; }
    public string? Description { get; init; }
    public string? BodyArea { get; init; }
    public string? Size { get; init; }
    public string? Style { get; init; }
    public string? References { get; init; }
    public string? PreferredArtistId { get; init; }
    public List<string>? ReferenceImages { get; init; }
    public string? Availability { get; init; }
    public string? Source { get; init; }
    /// <summary>Obbligatorio (true) per le richieste dal sito.</summary>
    public bool? PrivacyConsent { get; init; }

    /// <summary>
    /// Regole di frontend/src/api/requests/requestValidation.ts. Restituisce i messaggi per campo
    /// (chiavi in camelCase come nel frontend), vuoto se la richiesta è valida.
    /// </summary>
    public Dictionary<string, string> Validate()
    {
        var errors = new Dictionary<string, string>();
        var name = Clean(Name);
        var email = Clean(Email);
        var phone = Clean(Phone);
        var description = Clean(Description);
        var fromSite = Source == RequestSource.Sito;

        if (name == "") errors["name"] = "Inserisci il tuo nome.";
        else if (name.Length > 100) errors["name"] = "Il nome è troppo lungo.";
        if (email != "" && !EmailPattern().IsMatch(email)) errors["email"] = "Controlla l’indirizzo email.";
        if (phone != "" && (!PhonePattern().IsMatch(phone) || phone.Count(char.IsAsciiDigit) < 6))
            errors["phone"] = "Controlla il numero di telefono.";
        if (Clean(Contact) == "" && email == "" && phone == "")
            errors["contact"] = fromSite ? "Lasciaci almeno un recapito: email o telefono." : "Inserisci un contatto.";
        if (description == "") errors["description"] = "Descrivi la tua idea.";
        else if (fromSite && description.Length < 10) errors["description"] = "Raccontaci qualcosa in più (almeno 10 caratteri).";
        if (Clean(BodyArea) == "") errors["bodyArea"] = "Indica la zona del corpo.";
        if (Clean(Size) == "") errors["size"] = "Indica le dimensioni indicative.";
        if (Clean(Style) == "") errors["style"] = "Indica lo stile (anche “Non so”).";
        if ((ReferenceImages?.Count ?? 0) > RequestLimits.MaxReferenceImages)
            errors["referenceImages"] = "Puoi allegare al massimo " + RequestLimits.MaxReferenceImages + " immagini.";
        if (fromSite && PrivacyConsent != true)
            errors["privacyConsent"] = "Per inviare la richiesta devi accettare l’informativa privacy.";
        return errors;
    }

    /// <summary>
    /// Crea la richiesta da salvare (da chiamare dopo <see cref="Validate"/>): stato sempre "nuova",
    /// contatto composto da email e telefono se manca, data del consenso privacy se dato.
    /// </summary>
    public CustomerRequest ToNewRequest(string id, DateTimeOffset now)
    {
        var email = Optional(Email);
        var phone = Optional(Phone);
        var contact = Clean(Contact);
        if (contact == "") contact = string.Join(" · ", new[] { email, phone }.Where(value => value is not null));

        return new CustomerRequest
        {
            Id = id,
            Name = Clean(Name),
            Contact = contact,
            Email = email,
            Phone = phone,
            Description = Clean(Description),
            BodyArea = Clean(BodyArea),
            Size = Clean(Size),
            Style = Clean(Style),
            References = Clean(References),
            PreferredArtistId = Optional(PreferredArtistId),
            ReferenceImages = ReferenceImages ?? [],
            Availability = Optional(Availability),
            Source = Source ?? RequestSource.Sito,
            Status = RequestStatus.Nuova,
            Consultation = Consultation.Empty,
            CreatedAt = now,
            PrivacyConsentAt = PrivacyConsent == true ? now : null,
        };
    }

    private static string Clean(string? value) => value?.Trim() ?? "";
    private static string? Optional(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    // Stesse espressioni del frontend; [0-9] al posto di \d perché in .NET \d accetta anche cifre non latine.
    [GeneratedRegex(@"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")]
    private static partial Regex EmailPattern();
    [GeneratedRegex(@"^\+?[0-9\s().-]{6,20}$")]
    private static partial Regex PhonePattern();
}
