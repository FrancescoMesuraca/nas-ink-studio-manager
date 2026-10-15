using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NasInk.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Requests",
                columns: table => new
                {
                    Id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Contact = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    BodyArea = table.Column<string>(type: "text", nullable: false),
                    Size = table.Column<string>(type: "text", nullable: false),
                    Style = table.Column<string>(type: "text", nullable: false),
                    References = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    ConsultationSlot_ArtistId = table.Column<string>(type: "text", nullable: true),
                    ConsultationSlot_Date = table.Column<string>(type: "text", nullable: true),
                    ConsultationSlot_Start = table.Column<string>(type: "text", nullable: true),
                    ConsultationSlot_End = table.Column<string>(type: "text", nullable: true),
                    ConsultationSlot_Status = table.Column<string>(type: "text", nullable: true),
                    Email = table.Column<string>(type: "text", nullable: true),
                    Phone = table.Column<string>(type: "text", nullable: true),
                    PreferredArtistId = table.Column<string>(type: "text", nullable: true),
                    ReferenceImages = table.Column<List<string>>(type: "text[]", nullable: false),
                    Availability = table.Column<string>(type: "text", nullable: true),
                    Source = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    PrivacyConsentAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    Consultation_Colors = table.Column<string>(type: "text", nullable: false),
                    Consultation_Composition = table.Column<string>(type: "text", nullable: false),
                    Consultation_ImageUrl = table.Column<string>(type: "text", nullable: false),
                    Consultation_Notes = table.Column<string>(type: "text", nullable: false),
                    Consultation_Position = table.Column<string>(type: "text", nullable: false),
                    Consultation_Size = table.Column<string>(type: "text", nullable: false),
                    Consultation_Style = table.Column<string>(type: "text", nullable: false),
                    Consultation_Subject = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Requests", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Requests_CreatedAt",
                table: "Requests",
                column: "CreatedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Requests");
        }
    }
}
