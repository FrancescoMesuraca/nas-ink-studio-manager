using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

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
}
