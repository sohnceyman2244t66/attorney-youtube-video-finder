import axios from "axios";
import instanceFinder from "./instanceFinder.js";

class PipedService {
  constructor() {
    this.defaultInstances = [
      // CDN-backed first
      "https://pipedapi.kavin.rocks",
      "https://pipedapi.tokhmi.xyz",
      "https://pipedapi.moomoo.me",
      "https://pipedapi.syncpundit.io",
      // Other stable instances
      "https://api-piped.mha.fi",
      "https://piped-api.garudalinux.org",
      "https://pipedapi.adminforge.de",
      "https://pipedapi.privacy.com.de",
      "https://pipedapi.qdi.fi",
      "https://pipedapi.rivo.lol",
      "https://piped-api.linwood.dev",
      "https://pipedapi.palveluntarjoaja.eu",
      "https://api.piped.yt",
    ];
    this.currentIndex = 0;
    this.workingInstances = [];
    this.lastInstanceRefresh = 0;
    this.instanceRefreshInterval = 600000; // 10 minutes
  }

  async getInstances() {
    const now = Date.now();
    // Only attempt dynamic discovery if explicitly enabled
    if (process.env.PIPED_DYNAMIC === "1") {
      if (
        now - this.lastInstanceRefresh > this.instanceRefreshInterval ||
        this.workingInstances.length === 0
      ) {
        console.log("Refreshing Piped instances list...");
        try {
          this.workingInstances =
            await instanceFinder.getWorkingPipedInstances();
        } catch (e) {
          console.warn("Dynamic Piped instance fetch failed:", e.message);
          this.workingInstances = [];
        }
        this.lastInstanceRefresh = now;
        this.currentIndex = 0;
      }
      if (this.workingInstances.length > 0) {
        return this.workingInstances;
      }
    }
    return this.defaultInstances;
  }

  async getCurrentInstance() {
    const instances = await this.getInstances();
    return instances[this.currentIndex % instances.length];
  }

  async switchToNextInstance() {
    const instances = await this.getInstances();
    this.currentIndex = (this.currentIndex + 1) % instances.length;
  }

  async searchVideos(query, maxResults = 50, retryCount = 0) {
    const base = await this.getCurrentInstance();

    try {
      console.log(`Piped: searching on ${base} for: ${query}`);
      const response = await axios.get(`${base}/search`, {
        params: {
          q: query,
          filter: "videos",
        },
        timeout: 12000,
      });

      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.items || [];

      const videos = data
        .filter((it) => (it.type || "video").toLowerCase() === "video")
        .slice(0, maxResults)
        .map((v) => ({
          id: v.id || v.videoId || v.url?.split("v=")?.[1] || "",
          title: v.title || "",
          author: v.author || v.uploader || v.uploaderName || "",
          authorId: v.uploaderId || v.authorId || "",
          description: v.description || "",
          viewCount: v.views || v.viewCount || 0,
          lengthSeconds: v.duration || v.lengthSeconds || 0,
          publishedText: v.uploadedDate || v.publishedText || "",
          thumbnail:
            v.thumbnail || v.thumbnailUrl || v.thumbnails?.[0]?.url || "",
        }));

      console.log(`Piped: found ${videos.length} videos`);
      return videos;
    } catch (error) {
      console.error(`Piped error on ${base}:`, error.message);
      console.error("Piped error details:", {
        base,
        query,
        status: error.response?.status,
        data: error.response?.data,
        code: error.code,
      });

      const instances = await this.getInstances();
      if (retryCount < instances.length - 1) {
        await this.switchToNextInstance();
        return this.searchVideos(query, maxResults, retryCount + 1);
      }

      throw new Error("All Piped instances failed");
    }
  }

  async getTrendingVideos(
    category = "default",
    maxResults = 50,
    retryCount = 0
  ) {
    const base = await this.getCurrentInstance();

    try {
      console.log(`Piped: getting trending on ${base} (category: ${category})`);
      // Piped trending does not use category like Invidious, but returns trending feed
      const response = await axios.get(`${base}/trending`, {
        timeout: 12000,
      });

      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.items || [];

      const videos = data.slice(0, maxResults).map((v) => ({
        id: v.id || v.videoId || "",
        title: v.title || "",
        author: v.uploader || v.author || v.uploaderName || "",
        authorId: v.uploaderId || v.authorId || "",
        description: v.description || "",
        viewCount: v.views || v.viewCount || 0,
        lengthSeconds: v.duration || v.lengthSeconds || 0,
        publishedText: v.uploadedDate || v.publishedText || "",
        thumbnail:
          v.thumbnail || v.thumbnailUrl || v.thumbnails?.[0]?.url || "",
      }));

      console.log(`Piped: trending returned ${videos.length} videos`);
      return videos;
    } catch (error) {
      console.error(`Piped trending error on ${base}:`, error.message);
      console.error("Piped trending details:", {
        base,
        category,
        status: error.response?.status,
        data: error.response?.data,
        code: error.code,
      });

      const instances = await this.getInstances();
      if (retryCount < instances.length - 1) {
        await this.switchToNextInstance();
        return this.getTrendingVideos(category, maxResults, retryCount + 1);
      }

      throw new Error("All Piped instances failed");
    }
  }
}

export default new PipedService();
