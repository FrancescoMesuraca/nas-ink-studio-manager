using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using NasInk.Domain.Requests;
using NasInk.Domain.Site;
using NasInk.Domain.Studio;
using NasInk.Domain.Users;

namespace NasInk.Api.Data;

/// <summary>
/// Riempie un database vuoto con i dati demo del frontend (Data/Seed/*.json, copiati da
/// frontend/src/api/mock/seed). Se il database contiene già dati non fa nulla.
/// </summary>
public static class DbSeeder
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    // Solo le parti di studio.json che servono oggi; sale e prenotazioni arriveranno più avanti.
    private sealed record StudioSeed(StudioHours Hours, List<ArtistSeed> Artists, List<CustomerRequest> Requests);
    private sealed record ArtistSeed(string Id, string Name, string Color);
    private sealed record UserSeed(string Id, string Name, string Email, string Password, string Role, string? ArtistId);

    public static async Task SeedAsync(NasInkDbContext db, IPasswordHasher<User> passwordHasher, CancellationToken cancellationToken = default)
    {
        var seedFolder = Path.Combine(AppContext.BaseDirectory, "Data", "Seed");
        var studio = await ReadAsync<StudioSeed>(Path.Combine(seedFolder, "studio.json"), cancellationToken);

        if (!await db.StudioSettings.AnyAsync(cancellationToken))
        {
            db.StudioSettings.Add(new StudioSettings { Id = 1, Hours = studio.Hours });
            db.Artists.AddRange(studio.Artists.Select((artist, index) =>
                new Artist { Id = artist.Id, Name = artist.Name, Color = artist.Color, Position = index }));
        }

        // Controllo separato: i database creati prima della tabella Requests ricevono comunque le richieste demo.
        if (!await db.Requests.AnyAsync(cancellationToken))
            db.Requests.AddRange(studio.Requests);

        // Utenti demo: nel file la password è in chiaro (come nel mock), nel database salviamo solo l'hash.
        if (!await db.Users.AnyAsync(cancellationToken))
        {
            var users = await ReadAsync<List<UserSeed>>(Path.Combine(seedFolder, "users.json"), cancellationToken);
            db.Users.AddRange(users.Select(seed =>
            {
                var user = new User { Id = seed.Id, Name = seed.Name, Email = User.NormalizeEmail(seed.Email), Role = seed.Role, ArtistId = seed.ArtistId };
                user.PasswordHash = passwordHasher.HashPassword(user, seed.Password);
                return user;
            }));
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
