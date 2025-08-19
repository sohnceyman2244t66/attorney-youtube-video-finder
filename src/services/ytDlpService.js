import { execFile } from "child_process";
import path from "path";
import cacheService from "./cacheService.js";

class YtDlpService {
  constructor() {
    // Check if yt-dlp is in system PATH first (for server deployments)
    this.binaryPath =
      process.platform === "win32"
        ? path.join(process.cwd(), "bin", "yt-dlp.exe")
        : "yt-dlp"; // On Linux, assume yt-dlp is installed globally
  }

  execJson(args) {
    return new Promise((resolve, reject) => {
      const cmdArgs = ["-J", "--quiet", "--no-warnings", ...args];
      console.log(`yt-dlp exec: ${this.binaryPath} ${cmdArgs.join(" ")}`);
      const child = execFile(
        this.binaryPath,
        cmdArgs,
        {
          timeout: 300000, // 5 minutes for 50 videos
          maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large results
          windowsHide: true,
        },
        (error, stdout, stderr) => {
          if (error) {
            console.error("yt-dlp error:", error.message);
            console.error("stderr:", stderr);
            return reject(error);
          }
          try {
            const json = JSON.parse(stdout);
            return resolve(json);
          } catch (e) {
            console.error("yt-dlp JSON parse error:", e.message);
            return reject(e);
          }
        }
      );
    });
  }

  mapEntriesToVideos(entries) {
    return (entries || []).map((e) => ({
      id: e.id || e.video_id || "",
      title: e.title || "",
      author: e.uploader || e.channel || "",
      authorId: e.channel_id || e.channelid || "",
      description: e.description || "",
      viewCount: e.view_count || 0,
      lengthSeconds: e.duration || 0,
      publishedText: e.upload_date || "",
      thumbnail: e.thumbnail || (e.thumbnails && e.thumbnails[0]?.url) || "",
    }));
  }

  async searchVideos(query, maxResults = 50) {
    // Check cache first
    const cached = cacheService.getSearchResults(query, maxResults);
    if (cached) {
      return cached;
    }

    const spec = `ytsearch${maxResults}:${query}`;
    const json = await this.execJson([spec]);
    const entries = json.entries || json.items || [];
    const videos = this.mapEntriesToVideos(entries).slice(0, maxResults);
    console.log(`yt-dlp: found ${videos.length} videos for query: ${query}`);

    // Cache the results
    cacheService.setSearchResults(query, maxResults, videos);

    return videos;
  }

  async getTrendingVideos(category = "default", maxResults = 50) {
    // Approximate trending by searching trending + optional category keyword
    const q =
      category && category !== "default" ? `${category} trending` : "trending";
    return this.searchVideos(q, maxResults);
  }
}

export default new YtDlpService();
