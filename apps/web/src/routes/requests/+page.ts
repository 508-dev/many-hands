import { redirect } from "@sveltejs/kit";
import { auth } from "$lib/auth.svelte";
import type { PageLoad } from "./$types";

export const load: PageLoad = () => {
  if (!auth.isLoggedIn) {
    redirect(303, "/login?redirect=/requests");
  }
  return {};
};
