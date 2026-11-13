/// <reference path="../pb_data/types.d.ts" />
// PocketBase v0.40.6
//
// `users` create hooks (docs/architecture.md -> "Other hooks"):
//
//   * Honeypot: reject with 400 if the sign-up body carries a non-empty
//     `website` field (`website` is not a real field, so only bots that fill
//     every form field send it).
//   * `taking_requests` defaults to `true` unless the body explicitly sets it.

onRecordCreateRequest((e) => {
  const body = e.requestInfo().body;

  // Honeypot: a real user never submits `website`.
  const website = body.website;
  if (website !== undefined && website !== null && website !== "") {
    throw new BadRequestError("Invalid registration.", {});
  }

  // Default `taking_requests` to true unless the client supplied it.
  const taking = body.taking_requests;
  if (taking === undefined || taking === null) {
    e.record.set("taking_requests", true);
  }

  e.next();
}, "users");
