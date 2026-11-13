/// <reference path="../pb_data/types.d.ts" />
// PocketBase v0.40.6
//
// `skills` — what a member can help with. Public to browse (unless the member
// is suspended), owner-only to write.

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

    const skills = new Collection({
      type: "base",
      name: "skills",
      listRule: "user.suspended = false",
      viewRule: "user.suspended = false",
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
          name: "category",
          values: categories,
          maxSelect: 1,
          required: true,
        },
        { type: "text", name: "title", required: true, min: 2, max: 80 },
        { type: "text", name: "description", max: 300 },
        {
          type: "select",
          name: "mode",
          values: ["in_person", "remote", "either"],
          maxSelect: 1,
          required: true,
        },
        { type: "autodate", name: "created", onCreate: true, onUpdate: false },
        { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
      ],
      indexes: [
        "CREATE INDEX idx_skills_user ON skills (user)",
        "CREATE INDEX idx_skills_category ON skills (category)",
      ],
    });
    app.save(skills);
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId("skills"));
    } catch {
      // already gone
    }
  },
);
