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
  server: {
    port: process.env.PORT || 3000,
  },
};

