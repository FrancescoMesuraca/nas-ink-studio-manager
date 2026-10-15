using NasInk.Domain.Requests;

namespace NasInk.Api.Tests;

// Test delle regole di frontend/src/api/requests/requestValidation.ts portate in NewRequestInput.
// Non serve né il database né l'API: sono funzioni pure.
public sealed class RequestValidationTests
{
    internal static readonly NewRequestInput FromSite = new()
    {
        Name = "Chiara Rossi", Email = "chiara@example.com", Phone = "", Contact = "",
        Description = "Una piccola balena in fine line.", BodyArea = "Polso", Size = "Piccolo (fino a 5 cm)",
        Style = "Non so", References = "", ReferenceImages = [], Source = RequestSource.Sito,
        PrivacyConsent = true, PreferredArtistId = "artist-3",
    };

    [Fact]
    public void ValidSiteRequest_HasNoErrors() => Assert.Empty(FromSite.Validate());

    [Fact]
    public void SiteRequest_NeedsAContactAndPrivacyConsent()
    {
        var errors = (FromSite with { Email = " ", Phone = null, PrivacyConsent = false }).Validate();

        Assert.Equal("Lasciaci almeno un recapito: email o telefono.", errors["contact"]);
        Assert.Equal("Per inviare la richiesta devi accettare l’informativa privacy.", errors["privacyConsent"]);
    }

    [Theory]
    [InlineData("chiara@example", "email")]
    [InlineData("chiara example.com", "email")]
    public void InvalidEmail_IsRejected(string email, string field) =>
        Assert.Contains(field, (FromSite with { Email = email }).Validate().Keys);

    [Theory]
    [InlineData("+39 333 123 4567", true)]
    [InlineData("(02) 1234-5678", true)]
    [InlineData("12345", false)]          // troppo corto
    [InlineData("333 12a 4567", false)]   // lettere
    [InlineData("+ - ( ) . - -", false)]  // caratteri ammessi ma meno di 6 cifre
    public void Phone_FollowsFrontendRules(string phone, bool valid) =>
        Assert.Equal(valid, !(FromSite with { Phone = phone }).Validate().ContainsKey("phone"));

    [Fact]
    public void SiteDescription_NeedsAtLeastTenCharacters()
    {
        Assert.Equal("Raccontaci qualcosa in più (almeno 10 caratteri).", (FromSite with { Description = "Rosa" }).Validate()["description"]);
        // Dal gestionale basta una parola.
        Assert.False((FromSite with { Description = "Rosa", Source = RequestSource.Gestionale }).Validate().ContainsKey("description"));
    }

    [Fact]
    public void RequiredFieldsAndImageLimit()
    {
        var errors = (FromSite with { Name = "", BodyArea = "", Size = "", Style = "", ReferenceImages = ["a", "b", "c", "d"] }).Validate();

        Assert.Equal(["name", "bodyArea", "size", "style", "referenceImages"], errors.Keys);
        Assert.Equal("Il nome è troppo lungo.", (FromSite with { Name = new string('a', 101) }).Validate()["name"]);
    }

    [Fact]
    public void ToNewRequest_ForcesStatusAndBuildsContact()
    {
        var now = new DateTimeOffset(2026, 10, 15, 18, 0, 0, TimeSpan.Zero);

        var request = (FromSite with { Phone = " 333 1234567 " }).ToNewRequest("id-1", now);

        Assert.Equal(RequestStatus.Nuova, request.Status);
        Assert.Equal("chiara@example.com · 333 1234567", request.Contact);
        Assert.Equal(now, request.CreatedAt);
        Assert.Equal(now, request.PrivacyConsentAt);
        Assert.Equal(Consultation.Empty, request.Consultation);
        Assert.Null(request.ConsultationSlot);
    }
}
