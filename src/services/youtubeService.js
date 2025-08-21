import axios from "axios";
import { config } from "../config.js";
import pipedService from "./pipedService.js";
import ytDlpService from "./ytDlpService.js";
import instanceFinder from "./instanceFinder.js";

class YouTubeService {
  constructor() {
    this.currentInstanceIndex = 0;
    this.workingInstances = [];
    this.lastInstanceRefresh = 0;
    this.instanceRefreshInterval = 600000; // 10 minutes
  }

  // Get working instances dynamically
  async getWorkingInstances() {
    const now = Date.now();
    if (
      now - this.lastInstanceRefresh > this.instanceRefreshInterval ||
      this.workingInstances.length === 0
    ) {
      console.log("Refreshing working instances list...");
      this.workingInstances =
        await instanceFinder.getWorkingInvidiousInstances();
      this.lastInstanceRefresh = now;
      this.currentInstanceIndex = 0;
    }
    return this.workingInstances;
  }

  // Get current Invidious instance with fallback support
  async getCurrentInstance() {
    const instances = await this.getWorkingInstances();
    if (instances.length === 0) {
      // Use default if no working instances found
      return config.invidious.instances[this.currentInstanceIndex];
    }
    return instances[this.currentInstanceIndex % instances.length];
  }

  // Switch to next instance if current one fails
  async switchToNextInstance() {
    const instances = await this.getWorkingInstances();
    const totalInstances =
      instances.length || config.invidious.instances.length;
    this.currentInstanceIndex =
      (this.currentInstanceIndex + 1) % totalInstances;
  }

  // Search videos - go straight to yt-dlp since all APIs are blocked
  async searchVideos(query, maxResults = 50, retryCount = 0) {
    // If forced via env, use Piped only (for cloud)
    if (process.env.FORCE_PIPED === "1") {
      console.log("FORCE_PIPED=1 -> using Piped only for search");
      return await pipedService.searchVideos(query, maxResults);
    }

    // Prefer Piped in cloud to avoid YouTube bot checks, fallback to yt-dlp
    try {
      console.log("Trying Piped for search first");
      const pipedResults = await pipedService.searchVideos(query, maxResults);
      if (Array.isArray(pipedResults) && pipedResults.length > 0) {
        return pipedResults;
      }
      console.warn("Piped returned no results, falling back to yt-dlp");
    } catch (err) {
      console.warn("Piped search failed, falling back to yt-dlp:", err.message);
    }

    console.log("Using yt-dlp fallback for search");
    return await ytDlpService.searchVideos(query, maxResults);
  }

  // Get trending videos - go straight to yt-dlp since all APIs are blocked
  async getTrendingVideos(
    category = "default",
    maxResults = 50,
    retryCount = 0
  ) {
    // If forced via env, use Piped only (for cloud)
    if (process.env.FORCE_PIPED === "1") {
      console.log("FORCE_PIPED=1 -> using Piped only for trending");
      return await pipedService.getTrendingVideos(category, maxResults);
    }

    // Prefer Piped trending; fallback to yt-dlp approximation
    try {
      console.log("Trying Piped for trending first");
      const pipedTrending = await pipedService.getTrendingVideos(
        category,
        maxResults
      );
      if (Array.isArray(pipedTrending) && pipedTrending.length > 0) {
        return pipedTrending;
      }
      console.warn("Piped trending returned no results, falling back to yt-dlp");
    } catch (err) {
      console.warn("Piped trending failed, falling back to yt-dlp:", err.message);
    }

    console.log("Using yt-dlp fallback for trending");
    return await ytDlpService.getTrendingVideos(category, maxResults);
  }

  // Get video details - simplified since we're using yt-dlp
  async getVideoDetails(videoId, retryCount = 0) {
    // For now, return minimal details since yt-dlp is slower for single video
    return {
      id: videoId,
      title: "Video details not available",
      author: "",
      authorId: "",
      description: "",
      viewCount: 0,
      lengthSeconds: 0,
      publishedText: "",
      keywords: [],
      thumbnail: "",
    };
  }
}

export default new YouTubeService();
