/// <reference path="../pb_data/types.d.ts" />
// PocketBase v0.40.6
//
// Modifies the built-in `users` auth collection to match
// docs/architecture.md -> "3. Data model" -> "users".
//
//   * `name` becomes required with a 60-char cap (display name).
//   * `avatar` is constrained to a single, <= 3 MB image of an enumerated
//     MIME type (the `image/*` wildcard matches nothing in this version), with
//     100x100 and 300x300 thumbs.
//   * Adds the profile fields: `area`, `lat`, `lng`, `about`,
//     `taking_requests`, `adult`, `suspended`.
//   * `adult` is `required` — on a bool field `required` means "must be
//     true", which is exactly the 18+ attestation.
//   * `suspended` is never writable by clients (create/update rules reject it).
//
// Auth is password-only: OAuth2, OTP and MFA stay disabled and `manageRule`
// stays null, so nobody can grant themselves a new email/password/verified
// state through the API.

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");

    // --- rules ---------------------------------------------------------
    users.listRule = "suspended = false";
    users.viewRule = "suspended = false || id = @request.auth.id";
    // public sign-up; the honeypot/`suspended` guard lives here, `adult`
    // is enforced by the field's `required` (must be true).
    users.createRule = "@request.body.suspended:isset = false";
    users.updateRule =
      "id = @request.auth.id && @request.body.suspended:isset = false && (@request.body.adult:isset = false || @request.body.adult = true)";
    users.deleteRule = "id = @request.auth.id";
    users.authRule = "suspended = false";
    users.manageRule = null;

    // --- existing fields ----------------------------------------------
    const name = users.fields.getByName("name");
    name.required = true;
    name.max = 60;

    const avatar = users.fields.getByName("avatar");
    avatar.maxSelect = 1;
    avatar.maxSize = 3 * 1024 * 1024; // 3 MB
    avatar.mimeTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/heic",
      "image/heif",
      "image/bmp",
      "image/tiff",
    ];
    avatar.thumbs = ["100x100", "300x300"];

    // --- new fields ---------------------------------------------------
    // `required` is deliberately NOT set on `lat`/`lng` (a number field's
    // `required` means "non-zero", which would reject 0/absent coords).
    users.fields.addMarshaledJSON(
      JSON.stringify([
        { type: "text", name: "area", max: 120 },
        { type: "number", name: "lat" },
        { type: "number", name: "lng" },
        { type: "text", name: "about", max: 500 },
        { type: "bool", name: "taking_requests" },
        { type: "bool", name: "adult", required: true },
        { type: "bool", name: "suspended" },
      ]),
    );

    app.save(users);
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");

    // remove the fields we added (ignore any that are already gone)
    for (const name of ["area", "lat", "lng", "about", "taking_requests", "adult", "suspended"]) {
      users.fields.removeByName(name);
    }

    // restore the default name/avatar field settings
    const name = users.fields.getByName("name");
    name.required = false;
    name.max = 255;

    const avatar = users.fields.getByName("avatar");
    avatar.maxSelect = 1;
    avatar.maxSize = 0;
    avatar.mimeTypes = ["image/jpeg", "image/png", "image/svg+xml", "image/gif", "image/webp"];
    avatar.thumbs = [];

    // restore default rules
    users.listRule = "";
    users.viewRule = "";
    users.createRule = "";
    users.updateRule = "id = @request.auth.id";
    users.deleteRule = "id = @request.auth.id";
    users.authRule = "";

    app.save(users);
  },
);
