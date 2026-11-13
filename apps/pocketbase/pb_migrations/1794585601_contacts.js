/// <reference path="../pb_data/types.d.ts" />
// PocketBase v0.40.6
//
// `contacts` — each member's single, private contact method. Owner-only for
// every operation; nobody else can ever read this collection. Contact details
// only reach the other participant through the snapshot a hook copies into an
// accepted `requests` record.

migrate(
  (app) => {
    const usersId = app.findCollectionByNameOrId("users").id;

    const contacts = new Collection({
      type: "base",
      name: "contacts",
      listRule: "user = @request.auth.id",
      viewRule: "user = @request.auth.id",
      createRule: '@request.auth.id != "" && @request.body.user = @request.auth.id',
      updateRule:
        "user = @request.auth.id && (@request.body.user:isset = false || @request.body.user = @request.auth.id)",
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
        {
          type: "select",
          name: "method",
          values: ["email", "phone", "whatsapp", "signal", "telegram", "other"],
          maxSelect: 1,
          required: true,
        },
        { type: "text", name: "value", required: true, max: 200 },
        { type: "text", name: "note", max: 200 },
        { type: "autodate", name: "created", onCreate: true, onUpdate: false },
        { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE UNIQUE INDEX idx_contacts_user ON contacts (user)"],
    });
    app.save(contacts);
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId("contacts"));
    } catch {
      // already gone
    }
  },
);
