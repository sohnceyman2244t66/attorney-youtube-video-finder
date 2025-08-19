// Simple in-memory cache to avoid duplicate searches
class CacheService {
  constructor() {
    this.searchCache = new Map();
    this.cacheExpiry = 3600000; // 1 hour
  }

  // Generate cache key from search query
  getCacheKey(query, maxResults) {
    return `${query.toLowerCase()}_${maxResults}`;
  }

  // Get cached results
  getSearchResults(query, maxResults) {
    const key = this.getCacheKey(query, maxResults);
    const cached = this.searchCache.get(key);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      console.log(`Cache hit for: ${query}`);
      return cached.results;
    }

    return null;
  }

  // Cache search results
  setSearchResults(query, maxResults, results) {
    const key = this.getCacheKey(query, maxResults);
    this.searchCache.set(key, {
      results,
      timestamp: Date.now(),
    });

    // Clean old entries if cache gets too big
    if (this.searchCache.size > 100) {
      const oldestKey = this.searchCache.keys().next().value;
      this.searchCache.delete(oldestKey);
    }
  }

  // Clear cache
  clear() {
    this.searchCache.clear();
  }
}

export default new CacheService();
