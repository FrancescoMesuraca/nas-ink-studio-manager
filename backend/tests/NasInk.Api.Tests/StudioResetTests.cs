using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;

namespace NasInk.Api.Tests;

// Classe a parte con il suo database: il reset cancella i dati che gli altri test si aspettano.
public sealed class StudioResetTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Reset_RestoresDemoData()
    {
        var owner = await factory.LoginAsync(TestClients.Owner);
        await owner.DeleteAsync("/studio/bookings/booking-1");
        await owner.PostAsJsonAsync("/studio/rooms", new { name = "Da buttare" });

        var response = await owner.PostAsync("/studio/reset", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var studio = await owner.StudioAsync();
        Assert.Equal(2, studio.GetProperty("rooms").GetArrayLength());
        Assert.Equal(3, studio.GetProperty("bookings").GetArrayLength());
        Assert.Equal(3, studio.GetProperty("requests").GetArrayLength());
        // Gli utenti restano: il login di prima funziona ancora.
        Assert.Equal(HttpStatusCode.OK, (await owner.GetAsync("/auth/me")).StatusCode);
    }

    [Fact]
    public async Task Reset_OnlyOwnerAndOnlyWhenAllowed()
    {
        var artist = await factory.LoginAsync(TestClients.Artist);
        using var production = factory.WithWebHostBuilder(builder =>
            builder.UseSetting("Demo:AllowReset", "false")
        );
        var owner = await production.LoginAsync(TestClients.Owner);

        Assert.Equal(
            HttpStatusCode.Forbidden,
            (await artist.PostAsync("/studio/reset", null)).StatusCode
        );
        Assert.Equal(
            HttpStatusCode.NotFound,
            (await owner.PostAsync("/studio/reset", null)).StatusCode
        );
    }
}
