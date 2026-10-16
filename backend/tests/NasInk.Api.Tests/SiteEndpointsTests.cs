using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using NasInk.Domain.Site;

namespace NasInk.Api.Tests;

// IClassFixture: un solo container PostgreSQL condiviso da tutti i test di questa classe.
public sealed class SiteEndpointsTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task GetPublicSite_ReturnsSeededContentArtistsAndHours()
    {
        var response = await _client.GetAsync("/site/public");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        // Leggiamo il JSON "grezzo" per verificare i nomi dei campi che si aspetta il frontend.
        var site = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("NAS INK", site.GetProperty("content").GetProperty("studioName").GetString());
        Assert.Equal("09:00", site.GetProperty("hours").GetProperty("start").GetString());
        Assert.Equal("23:00", site.GetProperty("hours").GetProperty("end").GetString());

        // Tatuatori nell'ordine del gestionale, con bio e instagram presi dal profilo del sito.
        var artists = site.GetProperty("artists").EnumerateArray().ToList();
        Assert.Equal(
            ["artist-1", "artist-2", "artist-3"],
            artists.Select(a => a.GetProperty("id").GetString())
        );
        Assert.Equal("Maya Conti", artists[0].GetProperty("name").GetString());
        Assert.Equal("maya.ink", artists[0].GetProperty("instagram").GetString());
        // Campi facoltativi assenti (non null), come `photoUrl?: string` nel contratto TypeScript.
        Assert.False(artists[0].TryGetProperty("photoUrl", out _));
    }

    [Fact]
    public async Task GetPublicSite_AllowsFrontendOrigin()
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/site/public");
        request.Headers.Add("Origin", "http://localhost:5173");

        var response = await _client.SendAsync(request);

        Assert.Equal(
            "http://localhost:5173",
            response.Headers.GetValues("Access-Control-Allow-Origin").Single()
        );
    }

    [Fact]
    public async Task UnknownRoute_ReturnsErrorInApiFormat()
    {
        var response = await _client.GetAsync("/non-esiste");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var error = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Risorsa non trovata.", error.GetProperty("message").GetString());
    }

    // --- PUT /site: stessi casi di frontend/src/api/site/siteApi.mock.test.ts ---
    // Tutti i test della classe condividono il database: qui non cambiamo il nome dello studio,
    // che GetPublicSite_ReturnsSeededContentArtistsAndHours si aspetta invariato.

    [Fact]
    public async Task SaveContent_OnlyTitolareCanSave()
    {
        var content = await GetContentAsync();

        var anonymous = await _client.PutAsJsonAsync("/site", content);
        var artist = await LoginAsync("maya@nasink.demo");
        var asArtist = await artist.PutAsJsonAsync("/site", content);

        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, asArtist.StatusCode);
        Assert.Equal(
            "Non hai i permessi per questa operazione.",
            (await asArtist.Content.ReadFromJsonAsync<JsonElement>())
                .GetProperty("message")
                .GetString()
        );
    }

    [Fact]
    public async Task SaveContent_TitolareSavesAndPublicSiteIsUpdated()
    {
        var owner = await LoginAsync("titolare@nasink.demo");
        var content = await GetContentAsync();
        var changed = content with
        {
            Hero = content.Hero with { Title = "Nuovo titolo" },
            Theme = new SiteTheme("#A62B2B", "light", "modern"),
            Sections = content.Sections.Reverse().ToList(),
        };

        var response = await owner.PutAsJsonAsync("/site", changed);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var saved = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Nuovo titolo", saved.GetProperty("hero").GetProperty("title").GetString());

        // Rileggendo il sito pubblico (cioè il database) le modifiche ci sono ancora.
        var reloaded = await GetContentAsync();
        Assert.Equal("Nuovo titolo", reloaded.Hero.Title);
        Assert.Equal(new SiteTheme("#A62B2B", "light", "modern"), reloaded.Theme);
        Assert.Equal("contacts", reloaded.Sections[0].Id);
        Assert.Equal(content.Gallery.Count, reloaded.Gallery.Count);
    }

    [Fact]
    public async Task SaveContent_InvalidContent_Returns400WithFields()
    {
        var owner = await LoginAsync("titolare@nasink.demo");
        var content = await GetContentAsync();

        var response = await owner.PutAsJsonAsync(
            "/site",
            content with
            {
                StudioName = " ",
                Theme = content.Theme with { Accent = "rosso" },
            }
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Inserisci il nome dello studio.", error.GetProperty("message").GetString());
        var fields = error.GetProperty("fields");
        Assert.True(fields.TryGetProperty("studioName", out _));
        Assert.True(fields.TryGetProperty("accent", out _));
        // Il sito pubblico non è cambiato.
        Assert.Equal("NAS INK", (await GetContentAsync()).StudioName);
    }

    [Fact]
    public async Task SaveContent_IncompleteJson_Returns400NotServerError()
    {
        var owner = await LoginAsync("titolare@nasink.demo");

        var response = await owner.PutAsJsonAsync("/site", new { studioName = "NAS INK" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.True(
            (await response.Content.ReadFromJsonAsync<JsonElement>())
                .GetProperty("fields")
                .TryGetProperty("sections", out _)
        );
    }

    private async Task<SiteContent> GetContentAsync()
    {
        var site = await _client.GetFromJsonAsync<JsonElement>("/site/public");
        return site.GetProperty("content").Deserialize<SiteContent>(JsonSerializerOptions.Web)!;
    }

    /// <summary>Client con il token di un utente demo (password di Data/Seed/users.json).</summary>
    private async Task<HttpClient> LoginAsync(string email)
    {
        var response = await _client.PostAsJsonAsync(
            "/auth/login",
            new { email, password = "demo1234" }
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
