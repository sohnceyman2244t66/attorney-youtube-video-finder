import axios from "axios";

class InstanceFinder {
  constructor() {
    this.instancesApiUrl = "https://api.invidious.io/instances.json";
    this.lastFetch = null;
    this.cachedInstances = [];
    this.cacheExpiry = 3600000; // 1 hour
  }

  async fetchWorkingInstances() {
    try {
      // Check cache
      if (this.lastFetch && Date.now() - this.lastFetch < this.cacheExpiry) {
        return this.cachedInstances;
      }

      // Skip external API calls by default to prevent DNS/timeout issues
      // Set SKIP_EXTERNAL_APIS=0 in .env to enable dynamic instance fetching
      const skipExternal = process.env.SKIP_EXTERNAL_APIS !== "0";
      if (skipExternal) {
        console.log("Skipping external API calls, using fallback instances");
        return this.getFallbackInstances();
      }

      console.log("Fetching fresh instance list from api.invidious.io...");
      const response = await axios.get(this.instancesApiUrl, {
        timeout: 10000,
      });

      const instances = [];

      // Parse the response - it's an array of [domain, details]
      for (const [domain, details] of response.data) {
        if (details.api && details.type === "https" && details.monitor) {
          // Only include instances with API enabled, HTTPS, and monitoring data
          const uptime30d = details.monitor?.dailyRatios?.[0]?.ratio;
          if (uptime30d && parseFloat(uptime30d) > 90) {
            instances.push({
              url: `https://${domain}`,
              region: details.region || "unknown",
              uptime: uptime30d,
            });
          }
        }
      }

      // Sort by uptime
      instances.sort((a, b) => parseFloat(b.uptime) - parseFloat(a.uptime));

      console.log(`Found ${instances.length} working Invidious instances`);

      this.cachedInstances = instances;
      this.lastFetch = Date.now();

      return instances;
    } catch (error) {
      // Suppress network errors to prevent console spam
      console.log("Using fallback instances due to network error");
      return this.getFallbackInstances();
    }
  }

  getFallbackInstances() {
    // Fallback to hardcoded instances if API fails
    return [
      { url: "https://inv.nadeko.net", region: "CL", uptime: "95" },
      { url: "https://yewtu.be", region: "DE", uptime: "90" },
      { url: "https://invidious.nerdvpn.de", region: "UA", uptime: "90" },
    ];
  }

  async testInstance(instanceUrl) {
    try {
      const response = await axios.get(`${instanceUrl}/api/v1/stats`, {
        timeout: 5000,
        validateStatus: (status) => status === 200,
      });

      return response.data && response.data.software;
    } catch (error) {
      return false;
    }
  }

  async getWorkingInvidiousInstances() {
    const instances = await this.fetchWorkingInstances();
    const working = [];

    // Test instances in parallel
    const tests = instances.map(async (instance) => {
      const isWorking = await this.testInstance(instance.url);
      if (isWorking) {
        working.push(instance.url);
      }
    });

    await Promise.all(tests);

    console.log(`${working.length} instances passed health check`);
    return working;
  }

  async getWorkingPipedInstances() {
    // Skip external API calls by default to prevent DNS/timeout issues
    // Set SKIP_EXTERNAL_APIS=0 in .env to enable dynamic instance fetching
    const skipExternal = process.env.SKIP_EXTERNAL_APIS !== "0";
    if (skipExternal) {
      console.log(
        "Skipping external Piped API calls, using fallback instances"
      );
      return this.getFallbackPipedInstances();
    }

    // Fetch from piped instances list
    try {
      const response = await axios.get("https://piped-instances.kavin.rocks/", {
        timeout: 10000,
      });

      const instances = [];
      const lines = response.data.split("\n");

      for (const line of lines) {
        if (line.includes("https://") && line.includes("api")) {
          const match = line.match(/https:\/\/[^\s]+/);
          if (match) {
            instances.push(match[0]);
          }
        }
      }

      return instances.slice(0, 8); // Top 8 instances
    } catch (error) {
      // Suppress network errors to prevent console spam
      console.log("Using fallback Piped instances due to network error");
      return this.getFallbackPipedInstances();
    }
  }

  getFallbackPipedInstances() {
    // Fallback list
    return [
      "https://pipedapi.kavin.rocks",
      "https://pipedapi.tokhmi.xyz",
      "https://pipedapi.moomoo.me",
      "https://pipedapi.syncpundit.io",
    ];
  }
}

export default new InstanceFinder();
