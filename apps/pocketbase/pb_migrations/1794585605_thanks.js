/// <reference path="../pb_data/types.d.ts" />
// PocketBase v0.40.6
//
// `thanks` — public thank-you notes left on a helper's profile. Only the
// seeker of a `done` request can thank, once, for that request's helper.

migrate(
  (app) => {
    const usersId = app.findCollectionByNameOrId("users").id;
    const requestsId = app.findCollectionByNameOrId("requests").id;

    const thanks = new Collection({
      type: "base",
      name: "thanks",
      listRule: "author.suspended = false && helper.suspended = false",
      viewRule: "author.suspended = false && helper.suspended = false",
      createRule: [
        '@request.auth.id != ""',
        "&& @request.body.author = @request.auth.id",
        "&& request.seeker = @request.auth.id",
        '&& request.status = "done"',
        "&& @request.body.helper = request.helper",
      ].join(" "),
      updateRule:
        "author = @request.auth.id && @request.body.author:isset = false && @request.body.helper:isset = false && @request.body.request:isset = false",
      deleteRule: "author = @request.auth.id",
      fields: [
        {
          type: "relation",
          name: "request",
          collectionId: requestsId,
          maxSelect: 1,
          required: true,
          cascadeDelete: true,
        },
        {
          type: "relation",
          name: "author",
          collectionId: usersId,
          maxSelect: 1,
          required: true,
          cascadeDelete: true,
        },
        {
          type: "relation",
          name: "helper",
          collectionId: usersId,
          maxSelect: 1,
          required: true,
          cascadeDelete: true,
        },
        { type: "text", name: "message", required: true, min: 2, max: 300 },
        { type: "autodate", name: "created", onCreate: true, onUpdate: false },
        { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE UNIQUE INDEX idx_thanks_request ON thanks (request)"],
    });
    app.save(thanks);
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId("thanks"));
    } catch {
      // already gone
    }
  },
);
