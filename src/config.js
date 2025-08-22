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
  access: {
    // Read from env; do NOT expose to frontend
    key: process.env.APP_ACCESS_KEY || "ADANA999",
    cookieName: process.env.APP_AUTH_COOKIE || "auth",
    tokenTtlSeconds:
      Number.parseInt(process.env.APP_TOKEN_TTL_SECONDS || "86400", 10) ||
      86400, // 24h
  },
  rateLimit: {
    enable: process.env.RATE_LIMIT_DISABLED !== "1",
    windowMs:
      Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10) ||
      60000, // 1 min
    maxPerWindow:
      Number.parseInt(process.env.RATE_LIMIT_MAX || "60", 10) || 60,
    loginWindowMs:
      Number.parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW_MS || "300000", 10) ||
      300000, // 5 min
    loginMaxPerWindow:
      Number.parseInt(process.env.RATE_LIMIT_LOGIN_MAX || "8", 10) || 8,
    analyzeMaxPerWindow:
      Number.parseInt(process.env.RATE_LIMIT_ANALYZE_MAX || "10", 10) || 10,
  },
  server: {
    port: process.env.PORT || 3000,
  },
};
