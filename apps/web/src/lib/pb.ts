import PocketBase, { type RecordModel, type RecordService } from "pocketbase";

export const pb = new PocketBase("/");

export function collection<T extends RecordModel>(name: string): RecordService<T> {
  return pb.collection<T>(name);
}
