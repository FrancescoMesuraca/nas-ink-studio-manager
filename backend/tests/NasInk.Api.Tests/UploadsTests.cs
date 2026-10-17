using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;

namespace NasInk.Api.Tests;

public sealed class UploadsTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    // Bastano i primi byte: il formato si riconosce da lì, il resto del file non viene decodificato.
    private static readonly byte[] Png =
    [
        0x89,
        0x50,
        0x4E,
        0x47,
        0x0D,
        0x0A,
        0x1A,
        0x0A,
        1,
        2,
        3,
        4,
        5,
    ];

    [Fact]
    public async Task Image_IsSavedAndServed()
    {
        var client = factory.CreateClient();

        var response = await client.PostAsync("/uploads", Form(Png, "foto.png"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var url = (await response.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("url")
            .GetString()!;
        // URL assoluto, usabile direttamente in <img src>.
        Assert.StartsWith("http://localhost/uploads/", url);
        Assert.EndsWith(".png", url);

        var served = await client.GetAsync(new Uri(url).PathAndQuery);
        Assert.Equal(HttpStatusCode.OK, served.StatusCode);
        Assert.Equal("image/png", served.Content.Headers.ContentType?.MediaType);
        Assert.Equal("nosniff", served.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.Equal(Png, await served.Content.ReadAsByteArrayAsync());
    }

    [Fact]
    public async Task NotAnImageOrMissingFile_Returns400()
    {
        var client = factory.CreateClient();

        // Il nome e il Content-Type dicono "immagine", il contenuto no.
        var fake = await client.PostAsync("/uploads", Form("<script>"u8.ToArray(), "foto.jpg"));
        var missing = await client.PostAsync(
            "/uploads",
            new MultipartFormDataContent { { new StringContent("x"), "altro" } }
        );

        Assert.Equal(HttpStatusCode.BadRequest, fake.StatusCode);
        Assert.Equal(
            "“foto.jpg” non è un formato supportato: usa JPG, PNG o WebP.",
            await fake.MessageAsync()
        );
        Assert.Equal(HttpStatusCode.BadRequest, missing.StatusCode);
        Assert.Equal("Nessun file ricevuto.", await missing.MessageAsync());
    }

    [Fact]
    public async Task TooBig_Returns413()
    {
        using var limited = factory.WithWebHostBuilder(builder =>
            builder.UseSetting("Uploads:MaxBytes", "10")
        );

        var response = await limited.CreateClient().PostAsync("/uploads", Form(Png, "foto.png"));

        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, response.StatusCode);
    }

    [Fact]
    public async Task TooManyAnonymousUploads_Returns429_ButNotForStaff()
    {
        using var limited = factory.WithWebHostBuilder(builder =>
            builder.UseSetting("Uploads:RateLimit:PermitLimit", "2")
        );
        var anonymous = limited.CreateClient();
        var staff = await limited.LoginAsync(TestClients.Owner);

        for (var i = 0; i < 2; i++)
            Assert.Equal(
                HttpStatusCode.Created,
                (await anonymous.PostAsync("/uploads", Form(Png, "foto.png"))).StatusCode
            );
        var rejected = await anonymous.PostAsync("/uploads", Form(Png, "foto.png"));
        var fromStaff = await staff.PostAsync("/uploads", Form(Png, "foto.png"));

        Assert.Equal(HttpStatusCode.TooManyRequests, rejected.StatusCode);
        Assert.Equal(HttpStatusCode.Created, fromStaff.StatusCode);
    }

    private static MultipartFormDataContent Form(byte[] bytes, string fileName)
    {
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new("image/jpeg");
        return new MultipartFormDataContent { { file, "file", fileName } };
    }
}
