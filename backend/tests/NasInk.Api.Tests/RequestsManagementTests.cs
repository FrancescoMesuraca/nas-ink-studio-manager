using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace NasInk.Api.Tests;

// Operazioni del gestionale sulle richieste: stato, scheda di consulenza e fascia di consulenza.
// Il database è condiviso tra i test della classe: ognuno crea la sua richiesta e usa un giorno
// diverso, così l'ordine di esecuzione non conta.
public sealed class RequestsManagementTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task WithoutLogin_Returns401()
    {
        var response = await _client.PatchAsJsonAsync(
            "/requests/request-2",
            new { status = "approvata" }
        );

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task SetStatus_SavesValidStatusOnly()
    {
        var client = await LoginAsync();
        var id = await CreateRequestAsync();

        var saved = await client.PatchAsJsonAsync("/requests/" + id, new { status = "approvata" });
        var invalid = await client.PatchAsJsonAsync("/requests/" + id, new { status = "boh" });
        var missing = await client.PatchAsJsonAsync("/requests/nessuna", new { status = "chiusa" });

        Assert.Equal(HttpStatusCode.OK, saved.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
        Assert.Equal("Stato non valido.", await MessageAsync(invalid));
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
        Assert.Equal("Scheda cliente non trovata.", await MessageAsync(missing));
        Assert.Equal(
            "approvata",
            (await FindInStudioAsync(client, id)).GetProperty("status").GetString()
        );
    }

    [Fact]
    public async Task SaveConsultation_ReplacesTheWholeSheet()
    {
        var client = await LoginAsync();
        var id = await CreateRequestAsync();

        var response = await client.PutAsJsonAsync(
            "/requests/" + id + "/consultation",
            new { subject = "Peonia", colors = "Rosa e verde" }
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var consultation = (await FindInStudioAsync(client, id)).GetProperty("consultation");
        Assert.Equal("Peonia", consultation.GetProperty("subject").GetString());
        Assert.Equal("Rosa e verde", consultation.GetProperty("colors").GetString());
        // I campi non mandati diventano vuoti, non null.
        Assert.Equal("", consultation.GetProperty("notes").GetString());
    }

    [Fact]
    public async Task Slot_ProposeConfirmCancel()
    {
        var client = await LoginAsync();
        var id = await CreateRequestAsync();
        var slot = new
        {
            artistId = "artist-2",
            date = "2031-03-10",
            start = "10:00",
            end = "10:30",
        };

        var proposed = await client.PutAsJsonAsync("/requests/" + id + "/slot", slot);
        Assert.Equal(HttpStatusCode.OK, proposed.StatusCode);
        var afterProposal = await FindInStudioAsync(client, id);
        Assert.Equal(
            "proposta",
            afterProposal.GetProperty("consultationSlot").GetProperty("status").GetString()
        );
        Assert.Equal("nuova", afterProposal.GetProperty("status").GetString());

        var confirmed = await client.PostAsync("/requests/" + id + "/slot/confirm", null);
        Assert.Equal(HttpStatusCode.OK, confirmed.StatusCode);
        var afterConfirm = await FindInStudioAsync(client, id);
        var confirmedSlot = afterConfirm.GetProperty("consultationSlot");
        Assert.Equal("confermata", confirmedSlot.GetProperty("status").GetString());
        Assert.Equal("10:00", confirmedSlot.GetProperty("start").GetString());
        Assert.Equal("consulenza", afterConfirm.GetProperty("status").GetString());

        // Una fascia già confermata non si conferma di nuovo.
        var again = await client.PostAsync("/requests/" + id + "/slot/confirm", null);
        Assert.Equal(HttpStatusCode.Conflict, again.StatusCode);
        Assert.Equal("Non c’è una proposta da confermare.", await MessageAsync(again));

        var cancelled = await client.DeleteAsync("/requests/" + id + "/slot");
        Assert.Equal(HttpStatusCode.OK, cancelled.StatusCode);
        Assert.False(
            (await FindInStudioAsync(client, id)).TryGetProperty("consultationSlot", out _)
        );
    }

    [Fact]
    public async Task ProposeSlot_InvalidArtistOrTime_Returns400()
    {
        var client = await LoginAsync();
        var id = await CreateRequestAsync();

        var unknownArtist = await client.PutAsJsonAsync(
            "/requests/" + id + "/slot",
            new
            {
                artistId = "nessuno",
                date = "2031-03-11",
                start = "10:00",
                end = "10:30",
            }
        );
        var beforeOpening = await client.PutAsJsonAsync(
            "/requests/" + id + "/slot",
            new
            {
                artistId = "artist-1",
                date = "2031-03-11",
                start = "08:00",
                end = "08:30",
            }
        );
        var endBeforeStart = await client.PutAsJsonAsync(
            "/requests/" + id + "/slot",
            new
            {
                artistId = "artist-1",
                date = "2031-03-11",
                start = "11:00",
                end = "10:00",
            }
        );

        Assert.Equal(HttpStatusCode.BadRequest, unknownArtist.StatusCode);
        Assert.Equal("Tatuatore non valido.", await MessageAsync(unknownArtist));
        Assert.Equal(HttpStatusCode.BadRequest, beforeOpening.StatusCode);
        Assert.Equal("Scegli un orario tra 09:00 e 23:00.", await MessageAsync(beforeOpening));
        Assert.Equal(HttpStatusCode.BadRequest, endBeforeStart.StatusCode);
    }

    [Fact]
    public async Task ProposeSlot_ArtistBusy_Returns409()
    {
        var client = await LoginAsync();
        var id = await CreateRequestAsync();
        var demoDay = (await StudioAsync(client))
            .GetProperty("bookings")
            .EnumerateArray()
            .Single(booking => booking.GetProperty("id").GetString() == "booking-1")
            .GetProperty("date")
            .GetString();

        // booking-1: artist-1 dalle 10:00 alle 12:30 del giorno demo.
        var overBooking = await client.PutAsJsonAsync(
            "/requests/" + id + "/slot",
            new
            {
                artistId = "artist-1",
                date = demoDay,
                start = "11:00",
                end = "11:30",
            }
        );
        // request-1 (demo): consulenza confermata di artist-1 dalle 09:00 alle 09:30.
        var overConsultation = await client.PutAsJsonAsync(
            "/requests/" + id + "/slot",
            new
            {
                artistId = "artist-1",
                date = demoDay,
                start = "09:15",
                end = "09:45",
            }
        );
        // Fasce consecutive non si sovrappongono.
        var rightAfter = await client.PutAsJsonAsync(
            "/requests/" + id + "/slot",
            new
            {
                artistId = "artist-1",
                date = demoDay,
                start = "09:30",
                end = "10:00",
            }
        );

        Assert.Equal(HttpStatusCode.Conflict, overBooking.StatusCode);
        Assert.Equal(
            "Il tatuatore è occupato in questa fascia oraria.",
            await MessageAsync(overBooking)
        );
        Assert.Equal(HttpStatusCode.Conflict, overConsultation.StatusCode);
        Assert.Equal(HttpStatusCode.OK, rightAfter.StatusCode);

        // Riproporre la stessa richiesta nella sua fascia non è un conflitto con se stessa.
        var sameAgain = await client.PutAsJsonAsync(
            "/requests/" + id + "/slot",
            new
            {
                artistId = "artist-1",
                date = demoDay,
                start = "09:30",
                end = "10:00",
            }
        );
        Assert.Equal(HttpStatusCode.OK, sameAgain.StatusCode);
    }

    [Fact]
    public async Task ProposedSlot_BlocksOtherProposalsAndBookings()
    {
        var client = await LoginAsync();
        var first = await CreateRequestAsync();
        var second = await CreateRequestAsync();
        var slot = new
        {
            artistId = "artist-3",
            date = "2031-03-12",
            start = "15:00",
            end = "15:30",
        };

        Assert.Equal(
            HttpStatusCode.OK,
            (await client.PutAsJsonAsync("/requests/" + first + "/slot", slot)).StatusCode
        );
        // La seconda proposta nella stessa fascia viene rifiutata subito…
        Assert.Equal(
            HttpStatusCode.Conflict,
            (await client.PutAsJsonAsync("/requests/" + second + "/slot", slot)).StatusCode
        );
        // …e anche una prenotazione sopra la fascia proposta.
        var booking = await client.PostAsJsonAsync(
            "/studio/bookings",
            new
            {
                date = "2031-03-12",
                start = "14:00",
                end = "16:00",
                bedId = "bed-1",
                artistId = "artist-3",
            }
        );
        Assert.Equal(HttpStatusCode.Conflict, booking.StatusCode);
    }

    [Fact]
    public async Task ConfirmSlot_WithoutProposal_Returns409()
    {
        var client = await LoginAsync();
        var id = await CreateRequestAsync();

        var response = await client.PostAsync("/requests/" + id + "/slot/confirm", null);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    private async Task<string> CreateRequestAsync()
    {
        var response = await _client.PostAsJsonAsync("/requests", RequestValidationTests.FromSite);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("id")
            .GetString()!;
    }

    private static async Task<JsonElement> StudioAsync(HttpClient client) =>
        await client.GetFromJsonAsync<JsonElement>("/studio");

    private static async Task<JsonElement> FindInStudioAsync(HttpClient client, string id) =>
        (await StudioAsync(client))
            .GetProperty("requests")
            .EnumerateArray()
            .Single(request => request.GetProperty("id").GetString() == id);

    private static async Task<string?> MessageAsync(HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("message")
            .GetString();

    /// <summary>Client con il token di un tatuatore demo: le richieste non sono riservate al titolare.</summary>
    private async Task<HttpClient> LoginAsync()
    {
        var response = await _client.PostAsJsonAsync(
            "/auth/login",
            new { email = "maya@nasink.demo", password = "demo1234" }
        );
        response.EnsureSuccessStatusCode();
        var session = await response.Content.ReadFromJsonAsync<JsonElement>();
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            session.GetProperty("token").GetString()
        );
        return client;
    }
}
