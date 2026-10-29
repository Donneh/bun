export default defineNuxtConfig({
  compatibilityDate: "2026-10-29",
  devtools: { enabled: false },
  telemetry: false,
  ssr: false,
  devServer: { port: 3001 },
  css: ["@riftkeeper/ui/styles.css"],
  runtimeConfig: {
    public: { apiBase: "https://api.riftkeeper.app" },
  },
  app: {
    head: {
      title: "Riftkeeper",
      htmlAttrs: { lang: "en" },
      meta: [{ name: "description", content: "Search the Riftbound card list." }],
    },
  },
});
