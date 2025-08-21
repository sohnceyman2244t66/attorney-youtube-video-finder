import OpenAI from "openai";
import { config } from "../config.js";

class OpenAIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  // Analyze video for potential copyright infringement
  async analyzeVideoForInfringement(video) {
    try {
      // Heuristic guardrail: only flag obvious cheat promotion or clear piracy from title/desc
      const title = String(video.title || "");
      const description = String(video.description || "");
      const text = `${title}\n${description}`.toLowerCase();

      const promoIndicators = [
        "download",
        "undetected",
        "free",
        "link",
        "discord",
        "telegram",
        "injector",
        "loader",
        "bypass",
        "cheat menu",
        "aimbot",
        "esp",
        "wallhack",
        "crack",
        "cracked",
        "script",
        "cfg",
        "paste",
      ];

      const legitContextIndicators = [
        "expose",
        "exposed",
        "ban",
        "banned",
        "caught",
        "hunter",
        "counter",
        "report",
        "settings",
        "how to report",
        "news",
        "update",
        "montage",
        "highlights",
        "clip",
        "creative",
        "map code",
        "gamemode",
        "controller settings",
      ];

      const hasPromoIndicator = promoIndicators.some((w) => text.includes(w));
      const hasLegitContext = legitContextIndicators.some((w) => text.includes(w));

      const prompt = `Only output JSON. Decide if the video is clearly promoting copyright infringement (not just discussing it).

Video title: "${title}"
Channel: ${video.author || ""}
Description (snippet): "${description.slice(0, 200)}"

Rules:
- Only mark as infringing if it is CLEAR promotion/availability (e.g., download/undetected/free/link/discord/injector/loader/bypass) of cheats or pirated media.
- Do NOT mark as infringing for news, discussions, tutorials against cheating, controller settings, montages, highlights, or exposure content.
- If ambiguous, set isLikelyInfringing=false with low confidence.

Return JSON with:
{
  "isLikelyInfringing": boolean,
  "confidenceScore": 0-100,
  "reasons": ["max 3 very short reasons"],
  "copyrightType": "movie|tvshow|music|game|software|other|none",
  "fairUseFactors": []
}`;

      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1, // Lower temperature for consistent results
        max_tokens: 150, // Reduced for faster response
        response_format: { type: "json_object" },
      });

      const analysis = JSON.parse(response.choices[0].message.content);

      // Post-process with heuristic guardrail to reduce false positives
      const adjusted = { ...analysis };
      if (!hasPromoIndicator || hasLegitContext) {
        // If no promo words or has legit context, do not flag as infringing
        adjusted.isLikelyInfringing = false;
        adjusted.confidenceScore = Math.min(analysis.confidenceScore || 0, 60);
        if (!hasPromoIndicator) {
          adjusted.reasons = ["No explicit download/promo terms in title/desc"];
        } else if (hasLegitContext) {
          adjusted.reasons = ["Appears to discuss/expose, not promote"];
        }
        adjusted.copyrightType = analysis.copyrightType || "none";
        adjusted.fairUseFactors = [];
      } else {
        // If promo indicators present, ensure confidence is reasonably high
        adjusted.confidenceScore = Math.max(analysis.confidenceScore || 0, 70);
      }

      return {
        ...adjusted,
        videoId: video.id,
        videoTitle: video.title,
        channelName: video.author,
        analysisTimestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error analyzing video:", error);
      console.error("Full error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      // Return a default analysis on error
      return {
        videoId: video.id,
        videoTitle: video.title,
        channelName: video.author,
        isLikelyInfringing: false,
        confidenceScore: 0,
        reasons: ["Analysis failed"],
        copyrightType: "none",
        fairUseFactors: [],
        error: error.message,
        analysisTimestamp: new Date().toISOString(),
      };
    }
  }

  // Batch analyze multiple videos in parallel
  async analyzeVideos(videos, onProgress) {
    const BATCH_SIZE = 25; // Process 25 videos simultaneously
    const results = [];
    let completed = 0;

    console.log(
      `Analyzing ${videos.length} videos in batches of ${BATCH_SIZE}...`
    );

    // Process videos in batches
    for (let i = 0; i < videos.length; i += BATCH_SIZE) {
      const batch = videos.slice(i, i + BATCH_SIZE);
      const batchStart = Date.now();

      // Analyze batch in parallel
      const batchPromises = batch.map(async (video, batchIndex) => {
        const videoIndex = i + batchIndex + 1;

        // Call progress callback before starting
        if (onProgress) {
          onProgress({
            current: videoIndex,
            total: videos.length,
            currentVideo: video.title,
          });
        }

        try {
          const analysis = await this.analyzeVideoForInfringement(video);
          completed++;
          return analysis;
        } catch (error) {
          console.error(
            `Error analyzing video ${videoIndex}: ${error.message}`
          );
          completed++;
          return {
            videoId: video.id,
            videoTitle: video.title,
            channelName: video.author,
            isLikelyInfringing: false,
            confidenceScore: 0,
            reasons: ["Analysis failed"],
            copyrightType: "none",
            fairUseFactors: [],
            error: error.message,
            analysisTimestamp: new Date().toISOString(),
          };
        }
      });

      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      const batchTime = Date.now() - batchStart;
      console.log(
        `Batch ${
          Math.floor(i / BATCH_SIZE) + 1
        } completed in ${batchTime}ms (${completed}/${videos.length} total)`
      );

      // Small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < videos.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    // Return results in original order (search relevance order)
    // Removed sorting to maintain YouTube's search relevance ranking
    return results;
  }

  // Generate summary report
  generateReport(analyses) {
    const totalVideos = analyses.length;
    const likelyInfringing = analyses.filter((a) => a.isLikelyInfringing);
    const highConfidence = likelyInfringing.filter(
      (a) => a.confidenceScore >= 80
    );

    const typeBreakdown = {};
    likelyInfringing.forEach((a) => {
      typeBreakdown[a.copyrightType] =
        (typeBreakdown[a.copyrightType] || 0) + 1;
    });

    return {
      summary: {
        totalAnalyzed: totalVideos,
        likelyInfringing: likelyInfringing.length,
        highConfidence: highConfidence.length,
        percentageInfringing: (
          (likelyInfringing.length / totalVideos) *
          100
        ).toFixed(1),
      },
      typeBreakdown,
      topInfringing: likelyInfringing.slice(0, 10),
      timestamp: new Date().toISOString(),
    };
  }
}

export default new OpenAIService();
