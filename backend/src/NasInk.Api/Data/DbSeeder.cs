using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using NasInk.Domain.Site;
using NasInk.Domain.Studio;

namespace NasInk.Api.Data;

/// <summary>
/// Riempie un database vuoto con i dati demo del frontend (Data/Seed/*.json, copiati da
/// frontend/src/api/mock/seed). Se il database contiene già dati non fa nulla.
/// </summary>
public static class DbSeeder
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    // Solo le parti di studio.json che servono oggi; prenotazioni e richieste arriveranno più avanti.
    private sealed record StudioSeed(StudioHours Hours, List<ArtistSeed> Artists);
    private sealed record ArtistSeed(string Id, string Name, string Color);

    public static async Task SeedAsync(NasInkDbContext db, CancellationToken cancellationToken = default)
    {
        var seedFolder = Path.Combine(AppContext.BaseDirectory, "Data", "Seed");

        if (!await db.StudioSettings.AnyAsync(cancellationToken))
        {
            var studio = await ReadAsync<StudioSeed>(Path.Combine(seedFolder, "studio.json"), cancellationToken);
            db.StudioSettings.Add(new StudioSettings { Id = 1, Hours = studio.Hours });
            db.Artists.AddRange(studio.Artists.Select((artist, index) =>
                new Artist { Id = artist.Id, Name = artist.Name, Color = artist.Color, Position = index }));
        }

        if (!await db.SiteDocuments.AnyAsync(cancellationToken))
        {
            var content = await ReadAsync<SiteContent>(Path.Combine(seedFolder, "site.json"), cancellationToken);
            db.SiteDocuments.Add(new SiteDocument { Id = 1, Content = content });
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    private static async Task<T> ReadAsync<T>(string path, CancellationToken cancellationToken)
    {
        await using var stream = File.OpenRead(path);
        return await JsonSerializer.DeserializeAsync<T>(stream, JsonOptions, cancellationToken)
            ?? throw new InvalidOperationException("File di seed vuoto: " + path);
    }
}
