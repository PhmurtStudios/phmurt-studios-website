using Microsoft.Extensions.Options;
using PhmurtStudios.Api.Configuration;
using PhmurtStudios.Api.Entities;

namespace PhmurtStudios.Api.Services;

public class StartupAdminSeeder
{
    private readonly ITenantService _tenants;
    private readonly IUserService _users;
    private readonly ISigningKeyService _keys;
    private readonly ILogger<StartupAdminSeeder> _logger;

    public StartupAdminSeeder(ITenantService tenants, IUserService users, ISigningKeyService keys, ILogger<StartupAdminSeeder> logger)
    {
        _tenants = tenants;
        _users = users;
        _keys = keys;
        _logger = logger;
    }

    public async Task SeedAsync(CancellationToken ct = default)
    {
        const string tenantSlug = "phmurt-studios";
        const string tenantName = "Phmurt Studios";
        const string adminEmail = "dreverad18@gmail.com";
        const string adminPassword = "+diceGoblin18";
        const string adminName = "Aaron Drever";
        var adminRoleId = Guid.Parse("10000000-0000-0000-0000-000000000002");

        var tenant = await _tenants.GetBySlugAsync(tenantSlug, ct);
        if (tenant is null)
        {
            tenant = await _tenants.CreateAsync(new CreateTenantRequest
            {
                Name = tenantName,
                Slug = tenantSlug,
                Plan = "Starter"
            }, ct);
            _logger.LogInformation("Seeded tenant {TenantSlug}", tenantSlug);
        }
        else if (tenant.Status != TenantStatus.Active)
        {
            tenant = await _tenants.ActivateAsync(tenant.Id, ct);
        }

        var existingUser = await _users.GetByEmailAsync(tenant.Id, adminEmail, ct);
        if (existingUser is null)
        {
            existingUser = await _users.CreateAsync(new CreateUserRequest
            {
                TenantId = tenant.Id,
                Name = adminName,
                Email = adminEmail,
                Password = adminPassword,
                RoleId = adminRoleId,
                Status = UserStatus.Active
            }, ct);
            _logger.LogInformation("Seeded startup admin account {Email}", adminEmail);
        }
        else if (existingUser.Status != UserStatus.Active)
        {
            await _users.UpdateAsync(existingUser.Id, new UpdateUserRequest
            {
                Name = adminName,
                RoleId = adminRoleId,
                Status = UserStatus.Active
            }, ct);
            _logger.LogInformation("Activated existing startup admin account {Email}", adminEmail);
        }

        var activeKey = await _keys.GetActiveKeyAsync(tenant.Id, ct);
        if (activeKey is null)
        {
            await _keys.GenerateKeyPairAsync(tenant.Id, ct);
            _logger.LogInformation("Generated active signing key for seeded tenant {TenantSlug}", tenantSlug);
        }
    }
}
