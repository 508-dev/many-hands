import PocketBase, { type RecordModel, type RecordService } from "pocketbase";

export const pb = new PocketBase("/");

// Pages load several lists from the same collection at once (e.g. /me lists my
// needs and needs I could help with). The SDK's default auto-cancellation would
// silently abort all but the last of those, so turn it off app-wide.
pb.autoCancellation(false);

export function collection<T extends RecordModel>(name: string): RecordService<T> {
  return pb.collection<T>(name);
}
