/// <reference path="../pb_data/types.d.ts" />
// PocketBase v0.40.6
//
// `requests` lifecycle hooks (docs/architecture.md -> "Hook").
//
// The contact snapshots (`seeker_contact` / `helper_contact`) are server-set
// only. On create they are forced empty; on the `pending -> accepted`
// transition each side's snapshot is populated from their `contacts` record
// (falling back to `{ method: "email", value: <account email>, note: "" }`).
// On every other update the stored values are restored, so a client can never
// write them.
//
// NB: top-level function/const declarations in a hook file are NOT visible
// inside the registered handlers in this PocketBase version, so the snapshot
// helper is defined inside the handler.

// On create: force the contact snapshots empty (client values always ignored).
onRecordCreateRequest((e) => {
  e.record.set("seeker_contact", null);
  e.record.set("helper_contact", null);
  e.next();
}, "requests");

// On update: only populate the snapshots on pending -> accepted; otherwise
// restore the stored values.
onRecordUpdateRequest((e) => {
  const snapshot = (userId) => {
    // One contacts record per member (unique index on `user`). If the member
    // has not set one yet, fall back to their account email.
    const contacts = $app.findRecordsByFilter(
      "contacts",
      "user = {:u}",
      "",
      1,
      0,
      { u: userId },
    );

    if (contacts && contacts.length > 0) {
      const c = contacts[0];
      return {
        method: c.get("method"),
        value: c.get("value"),
        note: c.get("note"),
      };
    }

    return {
      method: "email",
      value: $app.findRecordById("users", userId).get("email"),
      note: "",
    };
  };

  const oldStatus = e.record.original().get("status");
  const newStatus = e.record.get("status");

  if (newStatus === "accepted" && oldStatus !== "accepted") {
    e.record.set("seeker_contact", snapshot(e.record.get("seeker")));
    e.record.set("helper_contact", snapshot(e.record.get("helper")));
  } else {
    e.record.set("seeker_contact", e.record.original().get("seeker_contact"));
    e.record.set("helper_contact", e.record.original().get("helper_contact"));
  }

  e.next();
}, "requests");
