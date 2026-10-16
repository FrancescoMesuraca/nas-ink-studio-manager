using System.Text.Json;
using NasInk.Domain.Site;

namespace NasInk.Api.Tests;

// Test delle regole di `validateSite` (frontend/src/api/site/siteApi.mock.ts) portate in SiteValidation.
// Funzioni pure: niente database né API.
public sealed class SiteValidationTests
{
    /// <summary>I contenuti demo di Data/Seed/site.json, gli stessi che il seed mette nel database.</summary>
    internal static readonly SiteContent Demo = JsonSerializer.Deserialize<SiteContent>(
        File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Data", "Seed", "site.json")),
        new JsonSerializerOptions(JsonSerializerDefaults.Web)
    )!;

    [Fact]
    public void DemoContent_HasNoErrors() => Assert.Empty(SiteValidation.Validate(Demo));

    [Fact]
    public void StudioNameAndAccent_AreChecked()
    {
        var errors = SiteValidation.Validate(
            Demo with
            {
                StudioName = " ",
                Theme = Demo.Theme with { Accent = "rosso" },
            }
        );

        Assert.Equal("Inserisci il nome dello studio.", errors["studioName"]);
        Assert.Equal("Il colore deve essere nel formato #rrggbb.", errors["accent"]);
    }

    [Theory]
    [InlineData("#A62B2B", true)]
    [InlineData("#a62b2b", true)]
    [InlineData("#a62b2", false)]
    [InlineData("a62b2b", false)]
    [InlineData("#a62b2g", false)]
    public void Accent_MustBeHexColor(string accent, bool valid)
    {
        var errors = SiteValidation.Validate(
            Demo with
            {
                Theme = Demo.Theme with { Accent = accent },
            }
        );

        Assert.Equal(valid, !errors.ContainsKey("accent"));
    }

    [Fact]
    public void ThemeValues_MustBeAllowed()
    {
        var errors = SiteValidation.Validate(
            Demo with
            {
                Theme = Demo.Theme with { Background = "grey", Font = "comic" },
            }
        );

        Assert.True(errors.ContainsKey("background"));
        Assert.True(errors.ContainsKey("font"));
    }

    [Fact]
    public void HeroContactsAndGallery_AreChecked()
    {
        var errors = SiteValidation.Validate(
            Demo with
            {
                Hero = Demo.Hero with { Title = "", CtaLabel = " " },
                Contacts = Demo.Contacts with { Email = "studio@nasink" },
                Gallery = [.. Demo.Gallery, new GalleryItem("g-nuova", "", null, null)],
            }
        );

        Assert.Equal(["heroTitle", "ctaLabel", "email", "gallery"], errors.Keys);
    }

    [Fact]
    public void EmptyStudioEmail_IsAllowed() =>
        Assert.Empty(
            SiteValidation.Validate(Demo with { Contacts = Demo.Contacts with { Email = "" } })
        );

    [Fact]
    public void Sections_MustListEachSectionOnce()
    {
        var missing = Demo with { Sections = Demo.Sections.Skip(1).ToList() };
        var duplicated = Demo with { Sections = [.. Demo.Sections.Skip(1), Demo.Sections[1]] };
        var reordered = Demo with { Sections = Demo.Sections.Reverse().ToList() };

        Assert.True(SiteValidation.Validate(missing).ContainsKey("sections"));
        Assert.True(SiteValidation.Validate(duplicated).ContainsKey("sections"));
        Assert.Empty(SiteValidation.Validate(reordered));
    }

    [Fact]
    public void MissingParts_AreErrorsNotCrashes()
    {
        // Come un JSON a cui mancano tema, hero, galleria e sezioni: il deserializzatore lascia null.
        var errors = SiteValidation.Validate(
            Demo with
            {
                Theme = null!,
                Hero = null!,
                Gallery = null!,
                Sections = null!,
                About = null!,
            }
        );

        Assert.Equal(
            [
                "accent",
                "background",
                "font",
                "heroTitle",
                "ctaLabel",
                "gallery",
                "sections",
                "content",
            ],
            errors.Keys
        );
    }

    [Fact]
    public void Normalize_ReplacesMissingTextsWithEmptyStrings()
    {
        var normalized = SiteValidation.Normalize(
            Demo with
            {
                Hero = Demo.Hero with { Subtitle = null! },
                Contacts = null!,
            }
        );

        Assert.Equal("", normalized.Hero.Subtitle);
        Assert.Equal(new SiteContacts("", "", "", null, null), normalized.Contacts);
    }
}
