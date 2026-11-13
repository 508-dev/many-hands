/// <reference path="../pb_data/types.d.ts" />
// PocketBase v0.40.6
//
// `requests` — the connection between two members. `seeker` is always the
// person who needs help and `helper` the person helping, whoever started it.
//
//   * kind = "ask"   : the seeker started it (from a skill or profile).
//   * kind = "offer" : the helper started it (from a need).
//
// The contact snapshots (`seeker_contact` / `helper_contact`) are server-set
// only — the create/update rules forbid clients from writing them and the
// hook (pb_hooks/requests.pb.js) manages their contents.
//
// Rule notes (verified against v0.40.6):
//   * Relation traversal works inside create rules. Bare names such as
//     `helper.taking_requests`, `helper.suspended`, `need.user` and
//     `need.status` all resolve against the would-be record's relation target.
//     (`@request.body.helper.taking_requests` also works; we use the bare form
//     for consistency with list/view rules.)
//   * In update rules, bare names are the stored values and `@request.body.*`
//     are the submitted ones; `:isset = false` forbids a field entirely.

const createRule = [
  '@request.auth.id != ""',
  '&& @request.body.status = "pending"',
  "&& (",
  // ask: seeker (me) reached out to a helper who is taking requests.
  "  (",
  '    @request.body.kind = "ask"',
  "    && @request.body.seeker = @request.auth.id",
  "    && @request.body.helper != @request.auth.id",
  "    && helper.taking_requests = true",
  "    && helper.suspended = false",
  "  )",
  "  ||",
  // offer: helper (me) offered help on the seeker's open need.
  "  (",
  '    @request.body.kind = "offer"',
  "    && @request.body.helper = @request.auth.id",
  "    && @request.body.seeker != @request.auth.id",
  "    && need.user = @request.body.seeker",
  '    && need.status = "open"',
  "  )",
  ")",
].join(" ");

const updateRule = [
  "(seeker = @request.auth.id || helper = @request.auth.id)",
  "&& @request.body.kind:isset = false",
  "&& @request.body.seeker:isset = false",
  "&& @request.body.helper:isset = false",
  "&& @request.body.skill:isset = false",
  "&& @request.body.need:isset = false",
  "&& @request.body.message:isset = false",
  "&& @request.body.seeker_contact:isset = false",
  "&& @request.body.helper_contact:isset = false",
  "&& (",
  // no status change (harmless no-op)
  "  @request.body.status:isset = false",
  // pending -> accepted / declined (recipient only)
  '  || (status = "pending" && (@request.body.status = "accepted" || @request.body.status = "declined") && ((kind = "ask" && helper = @request.auth.id) || (kind = "offer" && seeker = @request.auth.id)))',
  // pending -> withdrawn (initiator only)
  '  || (status = "pending" && @request.body.status = "withdrawn" && ((kind = "ask" && seeker = @request.auth.id) || (kind = "offer" && helper = @request.auth.id)))',
  // accepted -> done (either participant)
  '  || (status = "accepted" && @request.body.status = "done" && (seeker = @request.auth.id || helper = @request.auth.id))',
  ")",
].join(" ");

migrate(
  (app) => {
    const usersId = app.findCollectionByNameOrId("users").id;
    const skillsId = app.findCollectionByNameOrId("skills").id;
    const needsId = app.findCollectionByNameOrId("needs").id;

    const requests = new Collection({
      type: "base",
      name: "requests",
      listRule:
        '@request.auth.id != "" && (seeker = @request.auth.id || helper = @request.auth.id)',
      viewRule:
        '@request.auth.id != "" && (seeker = @request.auth.id || helper = @request.auth.id)',
      createRule,
      updateRule,
      deleteRule: null, // superusers only
      fields: [
        {
          type: "select",
          name: "kind",
          values: ["ask", "offer"],
          maxSelect: 1,
          required: true,
        },
        {
          type: "relation",
          name: "seeker",
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
        { type: "relation", name: "skill", collectionId: skillsId, maxSelect: 1 },
        { type: "relation", name: "need", collectionId: needsId, maxSelect: 1 },
        { type: "text", name: "message", required: true, min: 1, max: 500 },
        {
          type: "select",
          name: "status",
          values: ["pending", "accepted", "declined", "withdrawn", "done"],
          maxSelect: 1,
          required: true,
        },
        { type: "json", name: "seeker_contact" },
        { type: "json", name: "helper_contact" },
        { type: "autodate", name: "created", onCreate: true, onUpdate: false },
        { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
      ],
      indexes: [
        // one pending ask per (seeker, helper) pair
        "CREATE UNIQUE INDEX idx_requests_pending_ask ON requests (seeker, helper) WHERE kind = 'ask' AND status = 'pending'",
        // one open offer per (helper, need)
        "CREATE UNIQUE INDEX idx_requests_open_offer ON requests (helper, need) WHERE kind = 'offer' AND status IN ('pending', 'accepted')",
        "CREATE INDEX idx_requests_seeker ON requests (seeker)",
        "CREATE INDEX idx_requests_helper ON requests (helper)",
        "CREATE INDEX idx_requests_need ON requests (need)",
      ],
    });
    app.save(requests);
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId("requests"));
    } catch {
      // already gone
    }
  },
);
