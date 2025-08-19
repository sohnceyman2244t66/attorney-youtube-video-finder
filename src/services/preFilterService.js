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

    // Check title and description for keywords
    this.infringementKeywords.forEach((keyword) => {
      if (combined.includes(keyword)) {
        infringementScore += 2;
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

    // Calculate confidence
    const totalScore = infringementScore + legitimateScore;
    const infringementProbability =
      totalScore > 0 ? infringementScore / totalScore : 0;

    return {
      shouldAnalyze: infringementScore > 0 || legitimateScore === 0,
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
