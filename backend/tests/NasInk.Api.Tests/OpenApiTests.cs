using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace NasInk.Api.Tests;

public sealed class OpenApiTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Document_ListsEndpointsAndBearerLogin()
    {
        var client = factory.CreateClient();

        var document = await client.GetFromJsonAsync<JsonElement>("/openapi/v1.json");
        var swagger = await client.GetAsync("/swagger/index.html");

        var paths = document.GetProperty("paths");
        foreach (
            var path in new[]
            {
                "/auth/login",
                "/studio",
                "/studio/rooms/{id}",
                "/requests/{id}/slot",
                "/site",
                "/uploads",
            }
        )
            Assert.True(paths.TryGetProperty(path, out _), "Manca " + path);
        Assert.True(
            document
                .GetProperty("components")
                .GetProperty("securitySchemes")
                .TryGetProperty("Bearer", out _)
        );
        // Gli endpoint protetti hanno il lucchetto, quelli pubblici no.
        Assert.True(
            paths.GetProperty("/studio").GetProperty("get").TryGetProperty("security", out _)
        );
        Assert.False(
            paths.GetProperty("/site/public").GetProperty("get").TryGetProperty("security", out _)
        );
        Assert.Equal(HttpStatusCode.OK, swagger.StatusCode);
    }
}
