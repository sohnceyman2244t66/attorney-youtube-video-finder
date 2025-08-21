// Pre-filter videos to reduce AI analysis load
class PreFilterService {
  constructor() {
    // Keywords that strongly indicate potential infringement
    this.infringementKeywords = [
      "full movie",
      "full film",
      "entire movie",
      "complete movie",
      "hack",
      "cheat",
      "aimbot",
      "wallhack",
      "exploit",
      "mod menu",
      "cracked",
      "pirated",
      "leaked",
      "unreleased",
      "free download",
      "no survey",
      "working 2024",
      "working 2025",
      "100% working",
      "undetected",
      "bypass",
      "unlimited",
      "generator",
      "free coins",
      "free gems",
      "free vbucks",
      "discord",
      "injector",
      "loader",
      "key auth",
      "spoof",
    ];

    // High-weight distribution indicators
    this.distributionIndicators = [
      "download",
      "free",
      "link",
      "discord",
      "telegram",
      "t.me",
      "injector",
      "loader",
      "bypass",
      "keyauth",
      "key auth",
      "pastebin",
      "mediafire",
      "mega",
      "mega.nz",
      "gofile",
      "google drive",
      "drive.google.com",
      "bit.ly",
      "tinyurl",
      "goo.gl",
      "crack",
      "cracked",
    ];

    // Keywords that indicate likely legitimate content
    this.legitimateKeywords = [
      "official",
      "trailer",
      "review",
      "reaction",
      "commentary",
      "tutorial",
      "guide",
      "tips",
      "tricks",
      "gameplay",
      "walkthrough",
      "let's play",
      "highlights",
      "montage",
      "news",
      "update",
      "patch notes",
      "season",
      "exposed",
      "expose",
      "banned",
      "ban",
      "report",
      "settings",
      "controller",
      "creative",
      "map code",
    ];
  }

  // Quick pre-filter to identify obviously infringing content
  preFilterVideo(video) {
    const titleLower = video.title.toLowerCase();
    const descLower = (video.description || "").toLowerCase();
    const combined = titleLower + " " + descLower;

    // Count infringement indicators
    let infringementScore = 0;
    let legitimateScore = 0;

    // Shorts heuristic: de-prioritize likely Shorts
    const duration = Number.parseInt(video.lengthSeconds || 0, 10) || 0;
    const isShort = duration > 0 && duration <= 75;

    // Check title and description for keywords
    this.infringementKeywords.forEach((keyword) => {
      if (combined.includes(keyword)) {
        infringementScore += 1; // base weight for generic cheat terms
      }
    });

    // Strongly weight distribution indicators
    this.distributionIndicators.forEach((keyword) => {
      if (combined.includes(keyword)) {
        infringementScore += 3;
      }
    });

    this.legitimateKeywords.forEach((keyword) => {
      if (combined.includes(keyword)) {
        legitimateScore += 1;
      }
    });

    // Check for suspicious patterns
    if (/\d{4}/.test(titleLower) && titleLower.includes("working")) {
      infringementScore += 3;
    }

    if (titleLower.includes("download") && titleLower.includes("free")) {
      infringementScore += 3;
    }
    if (/(discord|t\.me|telegram)\//.test(descLower)) {
      infringementScore += 2; // suspicious outbound promo
    }

    // Shorts reduce priority if no distribution indicators
    if (isShort) {
      infringementScore = Math.max(0, infringementScore - 2);
    }

    // Calculate confidence
    const totalScore = infringementScore + legitimateScore;
    const infringementProbability =
      totalScore > 0 ? infringementScore / totalScore : 0;

    return {
      shouldAnalyze: infringementScore >= 2 || legitimateScore === 0,
      infringementScore,
      legitimateScore,
      infringementProbability,
      priority: infringementScore, // Higher score = higher priority
    };
  }

  // Filter and prioritize videos for AI analysis
  filterVideos(videos) {
    const filtered = videos.map((video) => ({
      ...video,
      preFilter: this.preFilterVideo(video),
    }));

    // Sort by priority (highest infringement score first)
    filtered.sort((a, b) => b.preFilter.priority - a.preFilter.priority);

    // Separate into high priority and low priority
    const highPriority = filtered.filter(
      (v) => v.preFilter.infringementScore >= 3
    );
    const mediumPriority = filtered.filter(
      (v) =>
        v.preFilter.infringementScore > 0 && v.preFilter.infringementScore < 3
    );
    const lowPriority = filtered.filter(
      (v) => v.preFilter.infringementScore === 0
    );

    console.log(
      `Pre-filter results: ${highPriority.length} high, ${mediumPriority.length} medium, ${lowPriority.length} low priority`
    );

    return {
      highPriority,
      mediumPriority,
      lowPriority,
      all: filtered,
    };
  }
}

export default new PreFilterService();
