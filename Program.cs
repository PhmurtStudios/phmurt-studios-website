using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using OpenIddict.Validation.AspNetCore;
using PhmurtStudios.Api.Authorization;
using PhmurtStudios.Api.Configuration;
using PhmurtStudios.Api.Data;
using PhmurtStudios.Api.Middleware;
using PhmurtStudios.Api.Services;
using StackExchange.Redis;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<SecuritySettings>(builder.Configuration.GetSection(SecuritySettings.SectionName));
var security = builder.Configuration.GetSection(SecuritySettings.SectionName).Get<SecuritySettings>() ?? new SecuritySettings();

builder.Services.AddDbContext<AppDbContext>(opts =>
    opts.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"), npgsql =>
    {
        npgsql.MigrationsAssembly("PhmurtStudios.Api");
        npgsql.EnableRetryOnFailure(3);
    }));

var redisConnectionString = builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379";
builder.Services.AddSingleton<IConnectionMultiplexer>(_ => ConnectionMultiplexer.Connect(redisConnectionString));
builder.Services.AddStackExchangeRedisCache(opts =>
{
    opts.Configuration = redisConnectionString;
    opts.InstanceName = "PhmurtStudios:";
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer();

builder.Services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
    .Configure<IServiceScopeFactory>((opts, scopeFactory) =>
    {
        opts.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
        opts.SaveToken = true;
        opts.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            ValidateIssuer = true,
            ValidIssuer = security.Issuer,
            ValidateAudience = true,
            ValidAudience = security.Audience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
            NameClaimType = JwtRegisteredClaimNames.Email,
            RoleClaimType = ClaimTypes.Role,
            IssuerSigningKeyResolver = (token, securityToken, kid, parameters) =>
            {
                if (string.IsNullOrWhiteSpace(kid)) return Enumerable.Empty<SecurityKey>();
                using var scope = scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var key = db.TenantSigningKeys.AsNoTracking().FirstOrDefault(k => k.KeyId == kid && k.Status == Entities.SigningKeyStatus.Active);
                if (key is null || string.IsNullOrWhiteSpace(key.PublicKeyPem)) return Enumerable.Empty<SecurityKey>();
                using var rsa = RSA.Create();
                rsa.ImportFromPem(key.PublicKeyPem.AsSpan());
                return new[] { new RsaSecurityKey(rsa.ExportParameters(false)) { KeyId = key.KeyId } };
            }
        };
        opts.Events = new JwtBearerEvents
        {
            OnTokenValidated = async ctx =>
            {
                var tenantIdClaim = ctx.Principal?.FindFirst("tenant_id")?.Value;
                var tenantSlug = ctx.Principal?.FindFirst("tenant_slug")?.Value;
                var jti = ctx.Principal?.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;
                if (!Guid.TryParse(tenantIdClaim, out var tenantId) || string.IsNullOrWhiteSpace(tenantSlug) || string.IsNullOrWhiteSpace(jti))
                {
                    ctx.Fail("Token missing required claims.");
                    return;
                }

                var scope = ctx.HttpContext.RequestServices.CreateScope();
                var tenants = scope.ServiceProvider.GetRequiredService<ITenantService>();
                var tenant = await tenants.GetByIdAsync(tenantId);
                if (tenant is null || tenant.Status != Entities.TenantStatus.Active || !tenant.Slug.Equals(tenantSlug, StringComparison.OrdinalIgnoreCase))
                {
                    ctx.Fail("Tenant validation failed.");
                }
            },
            OnAuthenticationFailed = ctx =>
            {
                var logger = ctx.HttpContext.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("JwtAuth");
                logger.LogWarning(ctx.Exception, "JWT authentication failed.");
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddOpenIddict()
    .AddValidation(options =>
    {
        options.UseAspNetCore();
    });

builder.Services.AddSingleton<IAuthorizationPolicyProvider, PermissionPolicyProvider>();
builder.Services.AddScoped<IAuthorizationHandler, PermissionAuthorizationHandler>();
builder.Services.AddAuthorization();

builder.Services.AddRateLimiter(opts =>
{
    opts.RejectionStatusCode = 429;
    opts.AddSlidingWindowLimiter("Strict", o => { o.PermitLimit = 5; o.Window = TimeSpan.FromMinutes(15); o.SegmentsPerWindow = 3; o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst; o.QueueLimit = 0; });
    opts.AddSlidingWindowLimiter("Standard", o => { o.PermitLimit = 30; o.Window = TimeSpan.FromMinutes(1); o.SegmentsPerWindow = 4; o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst; o.QueueLimit = 0; });
    opts.AddSlidingWindowLimiter("Relaxed", o => { o.PermitLimit = 60; o.Window = TimeSpan.FromMinutes(1); o.SegmentsPerWindow = 4; o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst; o.QueueLimit = 0; });
    opts.AddSlidingWindowLimiter("Permissive", o => { o.PermitLimit = 100; o.Window = TimeSpan.FromMinutes(1); o.SegmentsPerWindow = 6; o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst; o.QueueLimit = 0; });
    opts.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
    {
        var ip = ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetSlidingWindowLimiter(ip, _ => new SlidingWindowRateLimiterOptions
        {
            PermitLimit = 200,
            Window = TimeSpan.FromMinutes(1),
            SegmentsPerWindow = 4,
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            QueueLimit = 0
        });
    });
    opts.OnRejected = async (ctx, token) =>
    {
        ctx.HttpContext.Response.StatusCode = 429;
        await ctx.HttpContext.Response.WriteAsJsonAsync(new { error = "rate_limit_exceeded", message = "Too many requests. Please try again later." }, cancellationToken: token);
    };
});

builder.Services.AddScoped<ITenantService, TenantService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<ISigningKeyService, SigningKeyService>();
builder.Services.AddScoped<IPermissionService, PermissionService>();
builder.Services.AddScoped<IAuditService, AuditService>();
builder.Services.AddScoped<IOAuthClientService, OAuthClientService>();
builder.Services.AddScoped<IRoleService, RoleService>();
builder.Services.AddScoped<StartupAdminSeeder>();
builder.Services.AddHostedService<KeyRotationBackgroundService>();

builder.Services.AddCors(opts =>
{
    opts.AddPolicy("AllowFrontend", policy =>
    {
        var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? new[] { "https://phmurt.com", "http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5500" };
        policy.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod().AllowCredentials();
    });
});

builder.Services.Configure<JsonOptions>(opts =>
{
    opts.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddProblemDetails();
builder.Services.AddHealthChecks()
    .AddNpgSql(builder.Configuration.GetConnectionString("DefaultConnection") ?? string.Empty)
    .AddRedis(redisConnectionString);

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
    var seeder = scope.ServiceProvider.GetRequiredService<StartupAdminSeeder>();
    await seeder.SeedAsync();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseMiddleware<TenantValidationMiddleware>();
app.UseMiddleware<TenantStatusMiddleware>();
app.UseMiddleware<ClientPermissionMiddleware>();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health");
app.Run();
