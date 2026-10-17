using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace NasInk.Api.Tests;

/// <summary>Aiuti comuni ai test HTTP.</summary>
public static class TestClients
{
    public const string Owner = "titolare@nasink.demo";
    public const string Artist = "maya@nasink.demo";

    /// <summary>Client con il token di un utente demo (password di Data/Seed/users.json).</summary>
    public static async Task<HttpClient> LoginAsync<T>(
        this WebApplicationFactory<T> factory,
        string email
    )
        where T : class
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync(
            "/auth/login",
            new { email, password = "demo1234" }
        );
        response.EnsureSuccessStatusCode();
        var session = await response.Content.ReadFromJsonAsync<JsonElement>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            session.GetProperty("token").GetString()
        );
        return client;
    }

    public static async Task<string?> MessageAsync(this HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("message")
            .GetString();

    public static async Task<JsonElement> StudioAsync(this HttpClient client) =>
        await client.GetFromJsonAsync<JsonElement>("/studio");
}
