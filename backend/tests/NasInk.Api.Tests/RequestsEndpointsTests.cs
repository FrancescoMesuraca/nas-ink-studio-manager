using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NasInk.Api.Data;
using NasInk.Domain.Requests;

namespace NasInk.Api.Tests;

// Stessi casi di frontend/src/api/requests/requestsApi.mock.test.ts, ma via HTTP sul backend vero.
public sealed class RequestsEndpointsTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();
    private static readonly NewRequestInput FromSite = RequestValidationTests.FromSite;

    [Fact]
    public async Task SiteRequest_IsSavedAsNew()
    {
        var response = await _client.PostAsJsonAsync("/requests", FromSite);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("nuova", created.GetProperty("status").GetString());
        Assert.Equal("sito", created.GetProperty("source").GetString());
        Assert.Equal("chiara@example.com", created.GetProperty("contact").GetString());
        Assert.Equal("artist-3", created.GetProperty("preferredArtistId").GetString());
        Assert.True(created.TryGetProperty("createdAt", out _));
        Assert.True(created.TryGetProperty("privacyConsentAt", out _));
        Assert.False(created.TryGetProperty("privacyConsent", out _));
        Assert.False(created.TryGetProperty("consultationSlot", out _));

        // È davvero nel database.
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NasInkDbContext>();
        var saved = await db.Requests.SingleAsync(request => request.Id == created.GetProperty("id").GetString());
        Assert.Equal("Chiara Rossi", saved.Name);
    }

    [Fact]
    public async Task InvalidRequest_Returns400WithFieldsAndCorsHeader()
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/requests")
        {
            Content = JsonContent.Create(FromSite with { Email = "", Phone = "", PrivacyConsent = false }),
        };
        request.Headers.Add("Origin", "http://localhost:5173");

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        // Senza questo header il browser nasconderebbe il messaggio di errore al modulo.
        Assert.Equal("http://localhost:5173", response.Headers.GetValues("Access-Control-Allow-Origin").Single());
        var error = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Lasciaci almeno un recapito: email o telefono.", error.GetProperty("message").GetString());
        var fields = error.GetProperty("fields");
        Assert.True(fields.TryGetProperty("contact", out _));
        Assert.True(fields.TryGetProperty("privacyConsent", out _));
    }

    [Fact]
    public async Task UnknownArtistOrTooManyImages_Returns400()
    {
        var unknownArtist = await _client.PostAsJsonAsync("/requests", FromSite with { PreferredArtistId = "nessuno" });
        var tooManyImages = await _client.PostAsJsonAsync("/requests", FromSite with { ReferenceImages = ["a", "b", "c", "d"] });

        Assert.Equal(HttpStatusCode.BadRequest, unknownArtist.StatusCode);
        Assert.Equal("Tatuatore non valido.", (await unknownArtist.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("message").GetString());
        Assert.Equal(HttpStatusCode.BadRequest, tooManyImages.StatusCode);
        Assert.True((await tooManyImages.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("fields").TryGetProperty("referenceImages", out _));
    }

    [Fact]
    public async Task ManagementRequest_WithoutLogin_Returns401()
    {
        var response = await _client.PostAsJsonAsync("/requests", FromSite with { Source = RequestSource.Gestionale });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task TooManySubmissions_Returns429()
    {
        // Un'altra istanza dell'API, con lo stesso database ma un limite di 2 invii.
        using var limited = factory.WithWebHostBuilder(builder => builder.UseSetting("RateLimiting:PublicForm:PermitLimit", "2"));
        var client = limited.CreateClient();

        for (var i = 0; i < 2; i++)
            Assert.Equal(HttpStatusCode.Created, (await client.PostAsJsonAsync("/requests", FromSite)).StatusCode);
        var rejected = await client.PostAsJsonAsync("/requests", FromSite);

        Assert.Equal(HttpStatusCode.TooManyRequests, rejected.StatusCode);
        Assert.Equal("Hai inviato troppe richieste. Riprova tra qualche minuto.",
            (await rejected.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("message").GetString());
    }

    [Fact]
    public async Task DemoRequests_AreSeededWithTheirConsultationSlot()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NasInkDbContext>();

        var giulia = await db.Requests.SingleAsync(request => request.Id == "request-1");

        Assert.Equal("Drago giapponese", giulia.Consultation.Subject);
        Assert.Equal(new ConsultationSlot("artist-1", "2026-09-27", "09:00", "09:30", "confermata"), giulia.ConsultationSlot);
    }
}
