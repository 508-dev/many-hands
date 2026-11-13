/// <reference path="../pb_data/types.d.ts" />
// PocketBase v0.40.6
//
// `reports` — abuse reports. Any signed-in member can file one (always `open`);
// only superusers can read, update or resolve them (they moderate in the
// dashboard).

migrate(
  (app) => {
    const usersId = app.findCollectionByNameOrId("users").id;

    const reports = new Collection({
      type: "base",
      name: "reports",
      listRule: null,
      viewRule: null,
      createRule:
        '@request.auth.id != "" && @request.body.reporter = @request.auth.id && @request.body.status = "open"',
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          type: "relation",
          name: "reporter",
          collectionId: usersId,
          maxSelect: 1,
          required: true,
          cascadeDelete: true,
        },
        {
          type: "select",
          name: "target_type",
          values: ["user", "skill", "need", "request", "thanks"],
          maxSelect: 1,
          required: true,
        },
        { type: "text", name: "target_id", required: true, max: 30 },
        {
          type: "relation",
          name: "target_user",
          collectionId: usersId,
          maxSelect: 1,
        },
        {
          type: "select",
          name: "reason",
          values: ["spam", "scam", "harassment", "unsafe", "inappropriate", "other"],
          maxSelect: 1,
          required: true,
        },
        { type: "text", name: "details", max: 1000 },
        {
          type: "select",
          name: "status",
          values: ["open", "resolved", "dismissed"],
          maxSelect: 1,
          required: true,
        },
        { type: "autodate", name: "created", onCreate: true, onUpdate: false },
        { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
      ],
      indexes: [
        "CREATE INDEX idx_reports_reporter ON reports (reporter)",
        "CREATE INDEX idx_reports_status ON reports (status)",
      ],
    });
    app.save(reports);
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId("reports"));
    } catch {
      // already gone
    }
  },
);
