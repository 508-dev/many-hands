/// <reference path="../pb_data/types.d.ts" />
// PocketBase v0.40.6
//
// `needs` — the needs board. Public to browse (unless the poster is suspended),
// owner-only to write. A need is always created `open` and the owner drives it
// to `done` or `closed`.

const categories = [
  "building",
  "making",
  "art",
  "tech",
  "organizing",
  "teaching",
  "languages",
  "cooking",
  "garden",
  "moving",
  "care",
  "health",
  "music",
  "money",
  "other",
];

migrate(
  (app) => {
    const usersId = app.findCollectionByNameOrId("users").id;

    const needs = new Collection({
      type: "base",
      name: "needs",
      listRule: "user.suspended = false",
      viewRule: "user.suspended = false",
      createRule:
        '@request.auth.id != "" && @request.body.user = @request.auth.id && @request.body.status = "open"',
      updateRule: "user = @request.auth.id && (@request.body.user:isset = false || @request.body.user = @request.auth.id)",
      deleteRule: "user = @request.auth.id",
      fields: [
        {
          type: "relation",
          name: "user",
          collectionId: usersId,
          maxSelect: 1,
          required: true,
          cascadeDelete: true,
        },
        { type: "text", name: "title", required: true, min: 3, max: 100 },
        { type: "text", name: "details", max: 1000 },
        {
          type: "select",
          name: "category",
          values: categories,
          maxSelect: 1,
          required: true,
        },
        {
          type: "select",
          name: "mode",
          values: ["in_person", "remote", "either"],
          maxSelect: 1,
          required: true,
        },
        // copied from the poster's profile by the client, editable
        { type: "text", name: "area", max: 120 },
        { type: "number", name: "lat" },
        { type: "number", name: "lng" },
        { type: "text", name: "when", max: 80 },
        {
          type: "select",
          name: "status",
          values: ["open", "done", "closed"],
          maxSelect: 1,
          required: true,
        },
        { type: "autodate", name: "created", onCreate: true, onUpdate: false },
        { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
      ],
      indexes: [
        "CREATE INDEX idx_needs_user ON needs (user)",
        "CREATE INDEX idx_needs_status_created ON needs (status, created)",
      ],
    });
    app.save(needs);
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId("needs"));
    } catch {
      // already gone
    }
  },
);
