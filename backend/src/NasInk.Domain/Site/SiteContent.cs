namespace NasInk.Domain.Site;

// Contenuti del sito vetrina, stessa forma di `SiteContent` in frontend/src/api/types.ts.
// I campi stringa a valori fissi (background, font, id delle sezioni) restano stringhe come nel JSON.

public sealed record SiteContent(
    string StudioName,
    string? LogoUrl,
    SiteTheme Theme,
    SiteHero Hero,
    SiteAbout About,
    IReadOnlyList<GalleryItem> Gallery,
    IReadOnlyList<ArtistProfile> ArtistProfiles,
    SiteContacts Contacts,
    // L'ordine della lista è l'ordine in pagina; Visible = false nasconde la sezione.
    IReadOnlyList<SiteSection> Sections);

/// <param name="Background">"dark" | "light"</param>
/// <param name="Font">"classic" | "modern" | "bold"</param>
public sealed record SiteTheme(string Accent, string Background, string Font);

public sealed record SiteHero(string Title, string Subtitle, string ImageUrl, string CtaLabel);

public sealed record SiteAbout(string Title, string Text, string? ImageUrl);

public sealed record GalleryItem(string Id, string ImageUrl, string? Caption, string? ArtistId);

/// <summary>Bio e foto facoltative dei tatuatori; nome e colore arrivano dal gestionale.</summary>
public sealed record ArtistProfile(string ArtistId, string? Bio, string? PhotoUrl, string? Instagram);

public sealed record SiteContacts(string Address, string Phone, string Email, string? Instagram, string? MapUrl);

/// <param name="Id">"about" | "gallery" | "artists" | "contacts"</param>
public sealed record SiteSection(string Id, bool Visible);
