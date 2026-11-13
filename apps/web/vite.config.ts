import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

const pocketbase = `http://127.0.0.1:${process.env.PB_PORT ?? "8090"}`;

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    proxy: {
      "/api": pocketbase,
      "/_": pocketbase,
    },
  },
});
