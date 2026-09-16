using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RideSharing.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class Phase5RideMatchingSafety : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "RideId",
                table: "EmergencyAlerts",
                type: "uniqueidentifier",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AddColumn<DateTime>(
                name: "ActivatedAt",
                table: "EmergencyAlerts",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "EmergencyAlerts",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PlaceName",
                table: "EmergencyAlerts",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Status",
                table: "EmergencyAlerts",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Type",
                table: "EmergencyAlerts",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ActivatedAt",
                table: "EmergencyAlerts");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "EmergencyAlerts");

            migrationBuilder.DropColumn(
                name: "PlaceName",
                table: "EmergencyAlerts");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "EmergencyAlerts");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "EmergencyAlerts");

            migrationBuilder.AlterColumn<Guid>(
                name: "RideId",
                table: "EmergencyAlerts",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
        }
    }
}
