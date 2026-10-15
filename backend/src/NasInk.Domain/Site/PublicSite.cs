using NasInk.Domain.Studio;

namespace NasInk.Domain.Site;

/// <summary>Tatuatore come lo vede il sito pubblico: dati del gestionale + profilo del sito.</summary>
public sealed record PublicArtist(string Id, string Name, string Color, string? Bio, string? PhotoUrl, string? Instagram);

/// <summary>Tutto ciò che serve alla parte pubblica, senza dati riservati del gestionale.</summary>
public sealed record PublicSite(SiteContent Content, IReadOnlyList<PublicArtist> Artists, StudioHours Hours)
{
    /// <summary>
    /// Unisce i tatuatori del gestionale con i loro profili del sito (stessa logica di
    /// `getPublicSite` in siteApi.mock.ts). I tatuatori senza profilo compaiono senza bio né foto.
    /// </summary>
    public static PublicSite Create(SiteContent content, IEnumerable<Artist> artists, StudioHours hours)
    {
        var publicArtists = artists
            .OrderBy(artist => artist.Position)
            .Select(artist =>
            {
                var profile = content.ArtistProfiles.FirstOrDefault(item => item.ArtistId == artist.Id);
                return new PublicArtist(artist.Id, artist.Name, artist.Color, profile?.Bio, profile?.PhotoUrl, profile?.Instagram);
            })
            .ToList();
        return new PublicSite(content, publicArtists, hours);
    }
}
