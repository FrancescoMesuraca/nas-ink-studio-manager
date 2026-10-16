using System.Text.RegularExpressions;

namespace NasInk.Domain.Site;

/// <summary>
/// Regole di `validateSite` in frontend/src/api/site/siteApi.mock.ts, più il controllo dei valori
/// ammessi per sfondo e carattere del tema. Il contenuto arriva da un client che non controlliamo:
/// anche se nel record i campi non sono nullable, il JSON può non contenerli, quindi qui ogni
/// accesso tiene conto dei null.
/// </summary>
public static partial class SiteValidation
{
    public static readonly string[] SectionIds = ["about", "gallery", "artists", "contacts"];
    public static readonly string[] Backgrounds = ["dark", "light"];
    public static readonly string[] Fonts = ["classic", "modern", "bold"];

    /// <summary>Messaggi per campo (stesse chiavi del mock), vuoto se il contenuto è valido.</summary>
    public static Dictionary<string, string> Validate(SiteContent content)
    {
        var errors = new Dictionary<string, string>();
        if (string.IsNullOrWhiteSpace(content.StudioName))
            errors["studioName"] = "Inserisci il nome dello studio.";
        if (!AccentPattern().IsMatch(content.Theme?.Accent ?? ""))
            errors["accent"] = "Il colore deve essere nel formato #rrggbb.";
        if (!Backgrounds.Contains(content.Theme?.Background))
            errors["background"] = "Scegli uno sfondo chiaro o scuro.";
        if (!Fonts.Contains(content.Theme?.Font))
            errors["font"] = "Scegli uno dei caratteri proposti.";
        if (string.IsNullOrWhiteSpace(content.Hero?.Title))
            errors["heroTitle"] = "Inserisci il titolo principale.";
        if (string.IsNullOrWhiteSpace(content.Hero?.CtaLabel))
            errors["ctaLabel"] = "Inserisci il testo del pulsante.";
        if (
            !string.IsNullOrEmpty(content.Contacts?.Email)
            && !EmailPattern().IsMatch(content.Contacts.Email)
        )
            errors["email"] = "Email dello studio non valida.";
        if (
            content.Gallery is null
            || content.Gallery.Any(item => string.IsNullOrEmpty(item?.ImageUrl))
        )
            errors["gallery"] = "Ogni foto della galleria deve avere un’immagine.";

        // Ogni sezione esattamente una volta: stessa lunghezza e nessuna mancante esclude i doppioni.
        var ids = content.Sections?.Select(section => section?.Id).ToList() ?? [];
        if (ids.Count != SectionIds.Length || SectionIds.Any(id => !ids.Contains(id)))
            errors["sections"] = "Elenco delle sezioni non valido.";

        // Parti che il mock dà per scontate perché il frontend le manda sempre.
        if (content.About is null || content.ArtistProfiles is null)
            errors["content"] = "Contenuti del sito incompleti.";
        return errors;
    }

    /// <summary>
    /// Da chiamare dopo <see cref="Validate"/>: i testi obbligatori ma non controllati (sottotitolo,
    /// indirizzo…) diventano stringa vuota se mancano, così il sito pubblico non riceve mai null.
    /// </summary>
    public static SiteContent Normalize(SiteContent content) =>
        content with
        {
            Hero = content.Hero with
            {
                Subtitle = content.Hero.Subtitle ?? "",
                ImageUrl = content.Hero.ImageUrl ?? "",
            },
            About = content.About with
            {
                Title = content.About.Title ?? "",
                Text = content.About.Text ?? "",
            },
            Contacts = content.Contacts is null
                ? new SiteContacts("", "", "", null, null)
                : content.Contacts with
                {
                    Address = content.Contacts.Address ?? "",
                    Phone = content.Contacts.Phone ?? "",
                    Email = content.Contacts.Email ?? "",
                },
        };

    // [0-9a-fA-F] invece di \d o di RegexOptions.IgnoreCase: stesso comportamento di /i in JavaScript.
    [GeneratedRegex(@"^#[0-9a-fA-F]{6}$")]
    private static partial Regex AccentPattern();

    [GeneratedRegex(@"^\S+@\S+\.\S+$")]
    private static partial Regex EmailPattern();
}
