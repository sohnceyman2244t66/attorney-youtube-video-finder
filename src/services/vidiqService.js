import axios from "axios";

class VidIQService {
  constructor() {
    this.apiKey = process.env.VIDIQ_API_TOKEN || "";
    this.baseUrl = "https://api.vidiq.com";
  }

  // Get hot keywords for a game cheat search
  async getCheatKeywords(gameName) {
    try {
      const searchQuery = `${gameName} cheat`;
      console.log(`Getting VidIQ keywords for: ${searchQuery}`);

      const response = await axios.get(`${this.baseUrl}/xwords/hottersearch`, {
        params: {
          q: searchQuery,
          min_related_score: 0,
          group: "v5",
        },
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        timeout: 10000,
      });

      const keywords = response.data.keywords || [];

      // Define cheat-related terms to filter by
      const cheatTerms = [
        "cheat",
        "hack",
        "aimbot",
        "esp",
        "wallhack",
        "exploit",
        "mod",
        "trainer",
        "injector",
        "bypass",
        "undetected",
        "free",
        "download",
        "script",
        "macro",
        "bot",
        "auto",
      ];

      // Filter for cheat-related keywords only
      const cheatKeywords = keywords.filter((k) => {
        const keywordLower = k.keyword.toLowerCase();
        return cheatTerms.some((term) => keywordLower.includes(term));
      });

      // Sort by estimated monthly search volume
      cheatKeywords.sort(
        (a, b) => b.estimated_monthly_search - a.estimated_monthly_search
      );

      // Get top 5 cheat-related keywords (we already have mainKeyword as the 6th)
      const topKeywords = cheatKeywords
        .filter((k) => k.estimated_monthly_search > 0)
        .slice(0, 5)
        .map((k) => ({
          keyword: k.keyword,
          monthlySearches: k.estimated_monthly_search,
          competition: k.competition,
          relatedScore: k.related_score,
        }));

      console.log(
        `Found ${keywords.length} total keywords, ${cheatKeywords.length} cheat-related, selected top ${topKeywords.length}`
      );

      return {
        mainKeyword: searchQuery,
        topKeywords: topKeywords,
      };
    } catch (error) {
      console.error("Error getting VidIQ keywords:", error.message);

      // Fallback to basic keywords if VidIQ fails
      return {
        mainKeyword: `${gameName} cheat`,
        topKeywords: [
          { keyword: `${gameName} hack`, monthlySearches: 0 },
          { keyword: `${gameName} aimbot`, monthlySearches: 0 },
          { keyword: `${gameName} esp`, monthlySearches: 0 },
          { keyword: `${gameName} wallhack`, monthlySearches: 0 },
          { keyword: `free ${gameName} cheat`, monthlySearches: 0 },
        ],
      };
    }
  }
}

export default new VidIQService();
