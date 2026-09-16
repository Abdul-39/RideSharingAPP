using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RideSharing.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddUserSafetyAndVerificationFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ============================================================
            // USERS - only columns that are actually missing from DB
            // ============================================================

            migrationBuilder.AddColumn<string>(
                name: "CnicLast4",
                table: "Users",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StudentOrEmployeeId",
                table: "Users",
                type: "nvarchar(max)",
                nullable: true);


            // ============================================================
            // VERIFICATION REQUESTS
            // ============================================================

            migrationBuilder.CreateTable(
                name: "VerificationRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(
                        type: "uniqueidentifier",
                        nullable: false),

                    UserId = table.Column<Guid>(
                        type: "uniqueidentifier",
                        nullable: false),

                    Status = table.Column<int>(
                        type: "int",
                        nullable: false),

                    StudentOrEmployeeId = table.Column<string>(
                        type: "nvarchar(64)",
                        maxLength: 64,
                        nullable: true),

                    InstitutionId = table.Column<Guid>(
                        type: "uniqueidentifier",
                        nullable: true),

                    CnicEncryptedOrPlain = table.Column<string>(
                        type: "nvarchar(32)",
                        maxLength: 32,
                        nullable: true),

                    CnicLast4 = table.Column<string>(
                        type: "nvarchar(4)",
                        maxLength: 4,
                        nullable: true),

                    ApplicantNote = table.Column<string>(
                        type: "nvarchar(500)",
                        maxLength: 500,
                        nullable: true),

                    AdminNote = table.Column<string>(
                        type: "nvarchar(500)",
                        maxLength: 500,
                        nullable: true),

                    ReviewedByAdminId = table.Column<Guid>(
                        type: "uniqueidentifier",
                        nullable: true),

                    ReviewedAt = table.Column<DateTime>(
                        type: "datetime2",
                        nullable: true),

                    CreatedAt = table.Column<DateTime>(
                        type: "datetime2",
                        nullable: false),

                    UpdatedAt = table.Column<DateTime>(
                        type: "datetime2",
                        nullable: true),

                    IsDeleted = table.Column<bool>(
                        type: "bit",
                        nullable: false),

                    DeletedAt = table.Column<DateTime>(
                        type: "datetime2",
                        nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey(
                        "PK_VerificationRequests",
                        x => x.Id);

                    table.ForeignKey(
                        name: "FK_VerificationRequests_Institutions_InstitutionId",
                        column: x => x.InstitutionId,
                        principalTable: "Institutions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);

                    table.ForeignKey(
                        name: "FK_VerificationRequests_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });


            // ============================================================
            // DRIVER DOCUMENTS
            // ============================================================

            migrationBuilder.CreateTable(
                name: "DriverDocuments",
                columns: table => new
                {
                    Id = table.Column<Guid>(
                        type: "uniqueidentifier",
                        nullable: false),

                    UserId = table.Column<Guid>(
                        type: "uniqueidentifier",
                        nullable: false),

                    DocumentType = table.Column<int>(
                        type: "int",
                        nullable: false),

                    FileName = table.Column<string>(
                        type: "nvarchar(260)",
                        maxLength: 260,
                        nullable: false),

                    StoragePath = table.Column<string>(
                        type: "nvarchar(500)",
                        maxLength: 500,
                        nullable: false),

                    ContentType = table.Column<string>(
                        type: "nvarchar(100)",
                        maxLength: 100,
                        nullable: false),

                    FileSizeBytes = table.Column<long>(
                        type: "bigint",
                        nullable: false),

                    Status = table.Column<int>(
                        type: "int",
                        nullable: false),

                    AdminNote = table.Column<string>(
                        type: "nvarchar(max)",
                        nullable: true),

                    VerificationRequestId = table.Column<Guid>(
                        type: "uniqueidentifier",
                        nullable: true),

                    CreatedAt = table.Column<DateTime>(
                        type: "datetime2",
                        nullable: false),

                    UpdatedAt = table.Column<DateTime>(
                        type: "datetime2",
                        nullable: true),

                    IsDeleted = table.Column<bool>(
                        type: "bit",
                        nullable: false),

                    DeletedAt = table.Column<DateTime>(
                        type: "datetime2",
                        nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey(
                        "PK_DriverDocuments",
                        x => x.Id);

                    table.ForeignKey(
                        name: "FK_DriverDocuments_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);

                    table.ForeignKey(
                        name: "FK_DriverDocuments_VerificationRequests_VerificationRequestId",
                        column: x => x.VerificationRequestId,
                        principalTable: "VerificationRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });


            // ============================================================
            // INDEXES
            // ============================================================

            migrationBuilder.CreateIndex(
                name: "IX_VerificationRequests_InstitutionId",
                table: "VerificationRequests",
                column: "InstitutionId");

            migrationBuilder.CreateIndex(
                name: "IX_VerificationRequests_Status",
                table: "VerificationRequests",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_VerificationRequests_UserId",
                table: "VerificationRequests",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_DriverDocuments_UserId",
                table: "DriverDocuments",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_DriverDocuments_VerificationRequestId",
                table: "DriverDocuments",
                column: "VerificationRequestId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DriverDocuments");

            migrationBuilder.DropTable(
                name: "VerificationRequests");

            migrationBuilder.DropColumn(
                name: "CnicLast4",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "StudentOrEmployeeId",
                table: "Users");
        }
    }
}