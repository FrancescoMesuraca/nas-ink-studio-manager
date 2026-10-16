using System.Globalization;
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

    private sealed record StudioSeed(StudioHours Hours, List<RoomSeed> Rooms, List<ArtistSeed> Artists, List<Booking> Bookings, List<CustomerRequest> Requests);
    private sealed record RoomSeed(string Id, string Name, List<BedSeed> Beds);
    private sealed record BedSeed(string Id, string Name);
    private sealed record ArtistSeed(string Id, string Name, string Color);
    private sealed record UserSeed(string Id, string Name, string Email, string Password, string Role, string? ArtistId);

    /// <param name="today">Giorno corrente nel fuso dello studio: le prenotazioni demo vengono spostate a partire da qui.</param>
    public static async Task SeedAsync(NasInkDbContext db, IPasswordHasher<User> passwordHasher, DateOnly today, CancellationToken cancellationToken = default)
    {
        var seedFolder = Path.Combine(AppContext.BaseDirectory, "Data", "Seed");
        var studio = await ReadAsync<StudioSeed>(Path.Combine(seedFolder, "studio.json"), cancellationToken);
        ShiftToToday(studio, today);

        if (!await db.StudioSettings.AnyAsync(cancellationToken))
        {
            db.StudioSettings.Add(new StudioSettings { Id = 1, Hours = studio.Hours });
            db.Artists.AddRange(studio.Artists.Select((artist, index) =>
                new Artist { Id = artist.Id, Name = artist.Name, Color = artist.Color, Position = index }));
        }

        // Controlli separati per tabella: i database creati prima di una tabella ricevono comunque i suoi dati demo.
        if (!await db.Rooms.AnyAsync(cancellationToken))
        {
            db.Rooms.AddRange(studio.Rooms.Select((room, roomIndex) => new Room
            {
                Id = room.Id,
                Name = room.Name,
                Position = roomIndex,
                Beds = room.Beds.Select((bed, bedIndex) => new Bed { Id = bed.Id, Name = bed.Name, Position = bedIndex }).ToList(),
            }));
            db.Bookings.AddRange(studio.Bookings);
        }

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

    /// <summary>
    /// Le date demo in studio.json sono fisse (es. 2026-09-27). Le spostiamo tutte degli stessi giorni,
    /// così il primo giorno con prenotazioni diventa oggi e l'agenda appena aperta non è vuota.
    /// Anche le fasce di consulenza si spostano, per restare coerenti con le prenotazioni.
    /// </summary>
    private static void ShiftToToday(StudioSeed studio, DateOnly today)
    {
        if (studio.Bookings.Count == 0) return;
        var firstDay = studio.Bookings.Min(booking => DateOnly.ParseExact(booking.Date, "yyyy-MM-dd", CultureInfo.InvariantCulture));
        var days = today.DayNumber - firstDay.DayNumber;
        string Shift(string date) => DateOnly.ParseExact(date, "yyyy-MM-dd", CultureInfo.InvariantCulture).AddDays(days).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

        foreach (var booking in studio.Bookings) booking.Date = Shift(booking.Date);
        foreach (var request in studio.Requests.Where(request => request.ConsultationSlot is not null))
            request.ConsultationSlot = request.ConsultationSlot! with { Date = Shift(request.ConsultationSlot.Date) };
    }

    private static async Task<T> ReadAsync<T>(string path, CancellationToken cancellationToken)
    {
        await using var stream = File.OpenRead(path);
        return await JsonSerializer.DeserializeAsync<T>(stream, JsonOptions, cancellationToken)
            ?? throw new InvalidOperationException("File di seed vuoto: " + path);
    }
}
