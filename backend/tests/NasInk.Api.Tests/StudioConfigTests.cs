using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using NasInk.Api.Data;
using NasInk.Domain.Users;

namespace NasInk.Api.Tests;

// Configurazione dello studio (orari, sale, lettini, tatuatori). Il database è condiviso tra i test
// della classe: ognuno crea i propri elementi, e quelli demo si usano solo per i casi di conflitto.
public sealed class StudioConfigTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task ArtistRole_CannotChangeConfiguration()
    {
        var artist = await factory.LoginAsync(TestClients.Artist);

        var response = await artist.PostAsJsonAsync("/studio/rooms", new { name = "Sala nuova" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Hours_ValidatedAndKeepExistingAppointmentsInside()
    {
        var owner = await factory.LoginAsync(TestClients.Owner);

        var invalid = await owner.PutAsJsonAsync(
            "/studio/hours",
            new { start = "9", end = "23:00" }
        );
        var reversed = await owner.PutAsJsonAsync(
            "/studio/hours",
            new { start = "20:00", end = "10:00" }
        );
        // Le prenotazioni demo vanno dalle 10:00 alle 18:00 e c'è una consulenza alle 09:00.
        var tooNarrow = await owner.PutAsJsonAsync(
            "/studio/hours",
            new { start = "12:00", end = "23:00" }
        );
        var wider = await owner.PutAsJsonAsync(
            "/studio/hours",
            new { start = "08:00", end = "23:30" }
        );

        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, reversed.StatusCode);
        Assert.Equal(
            "La chiusura deve essere successiva all’apertura.",
            await reversed.MessageAsync()
        );
        Assert.Equal(HttpStatusCode.Conflict, tooNarrow.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, wider.StatusCode);
        var hours = (await owner.StudioAsync()).GetProperty("hours");
        Assert.Equal("08:00", hours.GetProperty("start").GetString());
        Assert.Equal("23:30", hours.GetProperty("end").GetString());

        // Torna all'orario demo, che gli altri test si aspettano.
        await owner.PutAsJsonAsync("/studio/hours", new { start = "09:00", end = "23:00" });
    }

    [Fact]
    public async Task RoomsAndBeds_AddRenameRemove()
    {
        var owner = await factory.LoginAsync(TestClients.Owner);

        var room = await owner.PostAsJsonAsync("/studio/rooms", new { name = "  Sala Fuji  " });
        Assert.Equal(HttpStatusCode.Created, room.StatusCode);
        var roomId = (await room.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("id")
            .GetString();
        var bed = await owner.PostAsJsonAsync(
            $"/studio/rooms/{roomId}/beds",
            new { name = "Lettino A" }
        );
        Assert.Equal(HttpStatusCode.Created, bed.StatusCode);
        var bedId = (await bed.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("id")
            .GetString();

        Assert.Equal(
            HttpStatusCode.NoContent,
            (
                await owner.PatchAsJsonAsync($"/studio/rooms/{roomId}", new { name = "Sala Etna" })
            ).StatusCode
        );
        Assert.Equal(
            HttpStatusCode.NoContent,
            (
                await owner.PatchAsJsonAsync($"/studio/beds/{bedId}", new { name = "Lettino B" })
            ).StatusCode
        );

        // La nuova sala è in fondo, con il nome ripulito dagli spazi e il lettino rinominato.
        var last = (await owner.StudioAsync()).GetProperty("rooms").EnumerateArray().Last();
        Assert.Equal("Sala Etna", last.GetProperty("name").GetString());
        Assert.Equal("Lettino B", last.GetProperty("beds")[0].GetProperty("name").GetString());

        Assert.Equal(
            HttpStatusCode.NoContent,
            (await owner.DeleteAsync($"/studio/beds/{bedId}")).StatusCode
        );
        await owner.PostAsJsonAsync($"/studio/rooms/{roomId}/beds", new { name = "Lettino C" });
        // Eliminando la sala spariscono anche i suoi lettini.
        Assert.Equal(
            HttpStatusCode.NoContent,
            (await owner.DeleteAsync($"/studio/rooms/{roomId}")).StatusCode
        );
        Assert.DoesNotContain(
            (await owner.StudioAsync()).GetProperty("rooms").EnumerateArray(),
            r => r.GetProperty("id").GetString() == roomId
        );
    }

    [Fact]
    public async Task RoomsAndBeds_ValidationNotFoundAndConflicts()
    {
        var owner = await factory.LoginAsync(TestClients.Owner);

        var emptyName = await owner.PostAsJsonAsync("/studio/rooms", new { name = "   " });
        var unknownRoom = await owner.PostAsJsonAsync(
            "/studio/rooms/nessuna/beds",
            new { name = "X" }
        );
        var unknownBed = await owner.PatchAsJsonAsync("/studio/beds/nessuno", new { name = "X" });
        // room-1 e bed-1 sono usati da booking-1.
        var usedRoom = await owner.DeleteAsync("/studio/rooms/room-1");
        var usedBed = await owner.DeleteAsync("/studio/beds/bed-1");

        Assert.Equal(HttpStatusCode.BadRequest, emptyName.StatusCode);
        Assert.Equal("Inserisci un nome.", await emptyName.MessageAsync());
        Assert.Equal(HttpStatusCode.NotFound, unknownRoom.StatusCode);
        Assert.Equal("Stanza non trovata.", await unknownRoom.MessageAsync());
        Assert.Equal(HttpStatusCode.NotFound, unknownBed.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, usedRoom.StatusCode);
        Assert.Equal(
            "Non puoi eliminare una stanza con lettini usati nelle prenotazioni.",
            await usedRoom.MessageAsync()
        );
        Assert.Equal(HttpStatusCode.Conflict, usedBed.StatusCode);
    }

    [Fact]
    public async Task Artists_AddUpdateRemove()
    {
        var owner = await factory.LoginAsync(TestClients.Owner);

        var created = await owner.PostAsJsonAsync(
            "/studio/artists",
            new { name = "Nina Galli", color = "#AA33CC" }
        );
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var id = (await created.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("id")
            .GetString();

        var invalidColor = await owner.PutAsJsonAsync(
            $"/studio/artists/{id}",
            new { name = "Nina Galli", color = "viola" }
        );
        var updated = await owner.PutAsJsonAsync(
            $"/studio/artists/{id}",
            new { name = "Nina G.", color = "#112233" }
        );

        Assert.Equal(HttpStatusCode.BadRequest, invalidColor.StatusCode);
        Assert.Equal("Colore non valido.", await invalidColor.MessageAsync());
        Assert.Equal(HttpStatusCode.NoContent, updated.StatusCode);
        var artist = (await owner.StudioAsync())
            .GetProperty("artists")
            .EnumerateArray()
            .Single(a => a.GetProperty("id").GetString() == id);
        Assert.Equal("Nina G.", artist.GetProperty("name").GetString());
        Assert.Equal("#112233", artist.GetProperty("color").GetString());

        Assert.Equal(
            HttpStatusCode.NoContent,
            (await owner.DeleteAsync($"/studio/artists/{id}")).StatusCode
        );
        Assert.Equal(
            HttpStatusCode.NotFound,
            (await owner.DeleteAsync($"/studio/artists/{id}")).StatusCode
        );
    }

    [Fact]
    public async Task RemoveArtist_InUseOrLinkedToAccount_Returns409()
    {
        var owner = await factory.LoginAsync(TestClients.Owner);
        var created = await owner.PostAsJsonAsync(
            "/studio/artists",
            new { name = "Con account", color = "#000000" }
        );
        var id = (await created.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("id")
            .GetString()!;
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<NasInkDbContext>();
            db.Users.Add(
                new User
                {
                    Id = "user-" + id,
                    Name = "Con account",
                    Email = id + "@example.com",
                    Role = Roles.Tatuatore,
                    ArtistId = id,
                }
            );
            await db.SaveChangesAsync();
        }

        // artist-1 ha prenotazioni demo.
        var withBookings = await owner.DeleteAsync("/studio/artists/artist-1");
        var withAccount = await owner.DeleteAsync($"/studio/artists/{id}");

        Assert.Equal(HttpStatusCode.Conflict, withBookings.StatusCode);
        Assert.Equal(
            "Non puoi eliminare un tatuatore usato in prenotazioni o consulenze.",
            await withBookings.MessageAsync()
        );
        Assert.Equal(HttpStatusCode.Conflict, withAccount.StatusCode);
        Assert.Equal(
            "Non puoi eliminare un tatuatore collegato a un account del gestionale.",
            await withAccount.MessageAsync()
        );
    }
}
