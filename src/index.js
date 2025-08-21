import "dotenv/config";
import express from "express";
import cors from "cors";
import { config } from "./config.js";
import youtubeService from "./services/youtubeService.js";
import openaiService from "./services/openaiService.js";
import vidiqService from "./services/vidiqService.js";
import preFilterService from "./services/preFilterService.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      youtube: "Invidious API",
      ai: "OpenAI GPT-3.5 Turbo",
    },
  });
});

// SSE endpoint for progress updates
app.get("/api/analyze/progress", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  // Store the response object for sending updates
  req.app.locals.progressClients = req.app.locals.progressClients || [];
  req.app.locals.progressClients.push(res);

  // Remove client on disconnect
  req.on("close", () => {
    const clients = req.app.locals.progressClients;
    const index = clients.indexOf(res);
    if (index > -1) {
      clients.splice(index, 1);
    }
  });
});

// Helper function to send progress updates
function sendProgressUpdate(app, data) {
  const clients = app.locals.progressClients || [];
  clients.forEach((client) => {
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  });
}

// Search and analyze videos endpoint
app.post("/api/analyze", async (req, res) => {
  console.log("=== /api/analyze endpoint called ===");
  console.log("Request body:", req.body);

  try {
    const {
      keywords,
      category,
      maxResults = 50,
      channelWhitelist = [],
    } = req.body;

    if (!keywords && !category) {
      console.log("Missing keywords and category, returning 400");
      return res.status(400).json({
        error: "Please provide either keywords or category",
      });
    }

    console.log("Starting analysis request:", {
      keywords,
      category,
      maxResults,
    });

    // Search videos or get trending by category
    let videos;
    if (keywords) {
      videos = await youtubeService.searchVideos(keywords, maxResults);
    } else {
      videos = await youtubeService.getTrendingVideos(category, maxResults);
    }

    if (videos.length === 0) {
      return res.json({
        message: "No videos found",
        videos: [],
        analyses: [],
        report: null,
      });
    }

    // Send initial progress
    sendProgressUpdate(req.app, {
      step: "search_complete",
      message: `Found ${videos.length} videos`,
      progress: 10,
    });

    // Apply channel whitelist filtering before any analysis
    const normalizedWhitelist = new Set(
      (channelWhitelist || []).map((c) => String(c).toLowerCase())
    );
    const videosAfterWhitelist = videos.filter(
      (v) => !normalizedWhitelist.has(String(v.author || "").toLowerCase())
    );

    // Pre-filter videos to reduce AI load
    const filteredVideos = preFilterService.filterVideos(videosAfterWhitelist);

    // Only analyze high and medium priority videos
    const videosToAnalyze = [
      ...filteredVideos.highPriority,
      ...filteredVideos.mediumPriority.slice(0, 20), // Limit medium priority
    ];

    console.log(
      `Pre-filtered ${videosAfterWhitelist.length} videos to ${videosToAnalyze.length} for AI analysis`
    );

    // Send filtering progress
    sendProgressUpdate(req.app, {
      step: "filter_complete",
      message: `Pre-filtered to ${videosToAnalyze.length} suspicious videos`,
      progress: 20,
      totalVideos: videosToAnalyze.length,
    });

    // Analyze videos for copyright infringement
    const analyses = await openaiService.analyzeVideos(
      videosToAnalyze,
      (progress) => {
        // Send real-time progress updates
        console.log(
          `Analyzing: ${progress.current}/${progress.total} - ${progress.currentVideo}`
        );

        const percentComplete =
          20 + Math.floor((progress.current / progress.total) * 70);
        sendProgressUpdate(req.app, {
          step: "analyzing",
          message: `Analyzing video ${progress.current} of ${progress.total}`,
          progress: percentComplete,
          current: progress.current,
          total: progress.total,
          currentVideo: progress.currentVideo,
        });
      }
    );

    // Generate summary report
    const report = openaiService.generateReport(analyses);

    res.json({
      message: "Analysis complete",
      videos: videos.length,
      analyses: analyses,
      report: report,
    });
  } catch (error) {
    console.error("Error in analysis:", error);
    console.error("Full error stack:", error.stack);
    res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
});

// Search game cheats with keyword research
app.post("/api/analyze-game", async (req, res) => {
  console.log("=== /api/analyze-game endpoint called ===");
  console.log("Request body:", req.body);

  try {
    const { gameName, channelWhitelist = [] } = req.body;

    if (!gameName) {
      return res.status(400).json({
        error: "Please provide a game name",
      });
    }

    console.log("Starting game cheat analysis for:", gameName);

    // Send initial progress
    sendProgressUpdate(req.app, {
      step: "keyword_research",
      message: `Researching cheat keywords for ${gameName}`,
      progress: 5,
    });

    // Get top keywords from VidIQ
    const keywordData = await vidiqService.getCheatKeywords(gameName);
    console.log("Keywords found:", keywordData);

    // Search videos for main keyword and top 5 keywords in parallel
    const allVideos = [];
    const videoIds = new Set(); // For deduplication

    // Prepare all search queries
    const searchQueries = [
      { keyword: keywordData.mainKeyword, label: "main keyword" },
    ];

    // Add top 5 keywords
    const topKeywords = keywordData.topKeywords.slice(0, 5);
    topKeywords.forEach((kwObj, i) => {
      searchQueries.push({
        keyword: kwObj.keyword,
        label: `${kwObj.keyword} (${kwObj.monthlySearches} searches/month)`,
      });
    });

    console.log(`Searching ${searchQueries.length} keywords in parallel...`);

    // Send search progress
    sendProgressUpdate(req.app, {
      step: "searching",
      message: `Searching ${searchQueries.length} keywords for ${gameName} cheats`,
      progress: 15,
      keywords: searchQueries.map((q) => q.keyword),
    });

    // Execute all searches in parallel for much faster results
    const searchPromises = searchQueries.map(({ keyword, label }) =>
      youtubeService
        .searchVideos(keyword, 50)
        .then((results) => ({ keyword, results }))
        .catch((err) => {
          console.error(`Error searching ${label}:`, err.message);
          return { keyword, results: [] };
        })
    );

    const searchResults = await Promise.all(searchPromises);

    // Process results and deduplicate
    // Normalize whitelist for channel name comparison
    const normalizedWhitelist = new Set(
      (channelWhitelist || []).map((c) => String(c).toLowerCase())
    );

    searchResults.forEach(({ keyword, results }) => {
      results.forEach((video) => {
        // Skip whitelisted channels
        if (normalizedWhitelist.has(String(video.author || "").toLowerCase())) {
          return;
        }
        if (!videoIds.has(video.id)) {
          videoIds.add(video.id);
          allVideos.push({ ...video, searchKeyword: keyword });
        }
      });
    });

    console.log(`Total unique videos found: ${allVideos.length}`);

    // Send deduplication progress
    sendProgressUpdate(req.app, {
      step: "search_complete",
      message: `Found ${allVideos.length} unique videos across all keywords`,
      progress: 30,
    });

    if (allVideos.length === 0) {
      return res.json({
        message: "No videos found",
        gameName: gameName,
        keywords: keywordData,
        totalVideosAnalyzed: 0,
        strikableVideosCount: 0,
        strikableVideos: [],
      });
    }

    // Pre-filter videos to reduce AI load (game cheats are usually obvious)
    const filteredVideos = preFilterService.filterVideos(allVideos);

    // For game cheats, only analyze high priority videos
    const videosToAnalyze = filteredVideos.highPriority;

    console.log(
      `Pre-filtered ${allVideos.length} videos to ${videosToAnalyze.length} high-priority for AI analysis`
    );

    // Send filtering progress
    sendProgressUpdate(req.app, {
      step: "filter_complete",
      message: `Pre-filtered to ${videosToAnalyze.length} high-priority cheat videos`,
      progress: 40,
      totalVideos: videosToAnalyze.length,
    });

    // Analyze videos for copyright infringement
    const analyses = await openaiService.analyzeVideos(
      videosToAnalyze,
      (progress) => {
        // Send real-time progress updates
        console.log(
          `Analyzing: ${progress.current}/${progress.total} - ${progress.currentVideo}`
        );

        const percentComplete =
          40 + Math.floor((progress.current / progress.total) * 50);
        sendProgressUpdate(req.app, {
          step: "analyzing",
          message: `Analyzing video ${progress.current} of ${progress.total}`,
          progress: percentComplete,
          current: progress.current,
          total: progress.total,
          currentVideo: progress.currentVideo,
        });
      }
    );

    // Filter only strikable videos (high confidence infringement)
    const strikableVideos = analyses
      .filter((a) => a.isLikelyInfringing && a.confidenceScore >= 70)
      .map((a) => ({
        url: `https://www.youtube.com/watch?v=${a.videoId}`,
        title: a.videoTitle,
        channel: a.channelName,
        confidenceScore: a.confidenceScore,
        keyword: allVideos.find((v) => v.id === a.videoId)?.searchKeyword || "",
        reasons: a.reasons,
      }));

    res.json({
      message: "Analysis complete",
      gameName: gameName,
      keywords: keywordData,
      totalVideosAnalyzed: allVideos.length,
      strikableVideosCount: strikableVideos.length,
      strikableVideos: strikableVideos,
    });
  } catch (error) {
    console.error("Error in game analysis:", error);
    console.error("Full game analysis error stack:", error.stack);
    res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
});

// Get trending categories
app.get("/api/categories", (req, res) => {
  res.json({
    categories: [
      { value: "default", label: "All Categories" },
      { value: "music", label: "Music" },
      { value: "gaming", label: "Gaming" },
      { value: "movies", label: "Movies" },
    ],
  });
});

// Get video details endpoint
app.get("/api/video/:videoId", async (req, res) => {
  try {
    const { videoId } = req.params;
    const video = await youtubeService.getVideoDetails(videoId);
    res.json(video);
  } catch (error) {
    console.error("Error getting video details:", error);
    res.status(500).json({
      error: error.message || "Failed to get video details",
    });
  }
});

// Start server
const PORT = config.server.port;
app.listen(PORT, () => {
  console.log("========================================");
  console.log(`Attorney YouTube Video Finder API running on port ${PORT}`);
  console.log(`Frontend: http://localhost:${PORT}`);
  console.log("========================================");
  console.log("Available endpoints:");
  console.log(`GET  /api/health`);
  console.log(`GET  /api/analyze/progress (SSE)`);
  console.log(`POST /api/analyze`);
  console.log(`POST /api/analyze-game`);
  console.log(`GET  /api/categories`);
  console.log(`GET  /api/video/:videoId`);
  console.log("========================================");
});
