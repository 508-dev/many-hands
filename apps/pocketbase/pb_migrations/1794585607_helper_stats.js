/// <reference path="../pb_data/types.d.ts" />
// PocketBase v0.40.6
//
// `helper_stats` — a public view collection exposing, per member, how many
// distinct seekers they have helped (`helped_count`) and how many thank-you
// notes they have received (`thanks_count`).
//
// Deviation from docs/architecture.md (documented in README.md): the SQL is
// written as a LEFT JOIN + GROUP BY rather than scalar subqueries. PocketBase
// cannot infer the scalar-subquery columns as integers (it falls back to
// `json`); the JOIN form lets `createViewFields` infer `helped_count` and
// `thanks_count` as proper `number` fields while returning identical counts.

const viewQuery = `SELECT u.id AS id,
  COUNT(DISTINCT r.seeker) AS helped_count,
  COUNT(DISTINCT t.id) AS thanks_count
FROM users u
LEFT JOIN requests r ON r.helper = u.id AND r.status = 'done'
LEFT JOIN thanks t ON t.helper = u.id
GROUP BY u.id`;

migrate(
  (app) => {
    const helperStats = new Collection({
      type: "view",
      name: "helper_stats",
      viewQuery,
      listRule: "",
      viewRule: "",
      createRule: null,
      updateRule: null,
      deleteRule: null,
    });

    // Let PocketBase infer the fields from the query (id: text pk,
    // helped_count/thanks_count: number).
    helperStats.fields = app.createViewFields(viewQuery);

    app.save(helperStats);
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId("helper_stats"));
    } catch {
      // already gone
    }
  },
);
