// Configuration for the application
// Secrets must come from environment variables only. See .env.sample.
export const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
  },
  invidious: {
    // Empty - all instances are blocked, go straight to yt-dlp
    instances: [],
    defaultInstance: null,
  },
  filters: {
    // Skip YouTube Shorts by default; set SKIP_SHORTS=0 to include them
    skipShorts: process.env.SKIP_SHORTS !== "0",
    // Treat videos with duration <= this as Shorts (seconds)
    shortsMaxSeconds:
      Number.parseInt(process.env.SHORTS_MAX_SECONDS || "75", 10) || 75,
  },
  server: {
    port: process.env.PORT || 3000,
  },
};
