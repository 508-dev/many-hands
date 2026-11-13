import { pb } from "./pb";
import type { User } from "./types";

let currentUser = $state<User | null>(pb.authStore.record as User | null);

pb.authStore.onChange((_token, record) => {
  currentUser = record as User | null;
}, true);

export const auth = {
  get user(): User | null {
    return currentUser;
  },
  get isLoggedIn(): boolean {
    return currentUser !== null;
  },
};
