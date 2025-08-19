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
    console.log("Using yt-dlp for search (APIs blocked)");
    return await ytDlpService.searchVideos(query, maxResults);
  }

  // Get trending videos - go straight to yt-dlp since all APIs are blocked
  async getTrendingVideos(
    category = "default",
    maxResults = 50,
    retryCount = 0
  ) {
    console.log("Using yt-dlp for trending (APIs blocked)");
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
