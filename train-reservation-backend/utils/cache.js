// utils/cache.js
/**
 * Simple In-Memory Cache Implementation
 * 
 * Time Complexity: O(1) for get/set operations
 * Space Complexity: O(N) where N is the number of cached items
 * 
 * This provides a basic caching layer with TTL (Time To Live) support
 * for caching expensive operations like Dijkstra calculations and
 * frequently accessed train availability data.
 */
class SimpleCache {
  constructor(defaultTTL = 300000) { // 5 minutes default TTL
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  set(key, value, ttl = this.defaultTTL) {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
    return true;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Create singleton instances for different use cases
const dijkstraCache = new SimpleCache(600000); // 10 minutes for route calculations
const trainAvailabilityCache = new SimpleCache(300000); // 5 minutes for availability data
const scheduleCache = new SimpleCache(1800000); // 30 minutes for schedule data

// Periodic cleanup (every 5 minutes)
setInterval(() => {
  dijkstraCache.cleanup();
  trainAvailabilityCache.cleanup();
  scheduleCache.cleanup();
}, 300000);

module.exports = {
  SimpleCache,
  dijkstraCache,
  trainAvailabilityCache,
  scheduleCache
};