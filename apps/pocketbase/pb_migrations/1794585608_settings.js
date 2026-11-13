/// <reference path="../pb_data/types.d.ts" />
// PocketBase v0.40.6
//
// App settings from docs/architecture.md -> "Settings":
//   * app name "Many Hands", app URL https://manyhands.508.dev
//   * no scheduled backups, SMTP off
//   * trusted proxy: X-Forwarded-For, rightmost IP (Traefik appends the real
//     client IP last; useLeftmostIP = false)
//   * rate limits enabled, keeping PocketBase's defaults and adding a stricter
//     guest sign-up limit (users:create, 5 per 10 minutes per IP)
//
// Deviation (documented in README.md): 127.0.0.1 is added to
// `rateLimits.excludedIPs` so that local dev, health checks and the smoke test
// (which all hit PocketBase directly on loopback) are not throttled. Real
// clients still arrive via Traefik and are rate-limited against the IP read
// from X-Forwarded-For, which is never 127.0.0.1.

migrate(
  (app) => {
    const settings = app.settings();

    settings.meta.appName = "Many Hands";
    settings.meta.appURL = "https://manyhands.508.dev";

    // No backups, no outgoing mail.
    settings.backups.cron = "";
    settings.smtp.enabled = false;

    settings.trustedProxy.headers = ["X-Forwarded-For"];
    settings.trustedProxy.useLeftmostIP = false;

    settings.rateLimits.enabled = true;
    settings.rateLimits.rules = [
      // PocketBase's default rules, preserved verbatim.
      { label: "*:auth", audience: "", duration: 3, maxRequests: 2 },
      { label: "*:create", audience: "", duration: 5, maxRequests: 20 },
      { label: "/api/batch", audience: "", duration: 1, maxRequests: 3 },
      { label: "/api/", audience: "", duration: 10, maxRequests: 300 },
      // Stricter public sign-up limit.
      { label: "users:create", audience: "@guest", duration: 600, maxRequests: 5 },
    ];
    settings.rateLimits.excludedIPs = ["127.0.0.1"];

    app.save(settings);
  },
  (app) => {
    const settings = app.settings();

    settings.meta.appName = "Acme";
    settings.meta.appURL = "http://localhost:8090";

    settings.backups.cron = "";
    settings.smtp.enabled = false;

    settings.trustedProxy.headers = [];
    settings.trustedProxy.useLeftmostIP = false;

    settings.rateLimits.enabled = false;
    settings.rateLimits.rules = [
      { label: "*:auth", audience: "", duration: 3, maxRequests: 2 },
      { label: "*:create", audience: "", duration: 5, maxRequests: 20 },
      { label: "/api/batch", audience: "", duration: 1, maxRequests: 3 },
      { label: "/api/", audience: "", duration: 10, maxRequests: 300 },
    ];
    settings.rateLimits.excludedIPs = [];

    app.save(settings);
  },
);
