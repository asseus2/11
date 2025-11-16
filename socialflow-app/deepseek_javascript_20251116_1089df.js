class SmartCache {
    constructor(options = {}) {
        this.strongCache = new Map();
        this.weakCache = new WeakMap();
        this.accessCount = new Map();
        this.creationTime = new Map();
        
        this.config = {
            maxSize: options.maxSize || 100,
            defaultTTL: options.defaultTTL || 30000,
            cleanupInterval: options.cleanupInterval || 60000,
            ...options
        };

        this.startCleanupInterval();
    }

    set(key, value, options = {}) {
        const { ttl = this.config.defaultTTL, strong = false } = options;
        
        if (strong) {
            if (this.strongCache.size >= this.config.maxSize) {
                this.evictLRU();
            }
            
            this.strongCache.set(key, value);
            this.accessCount.set(key, 1);
            this.creationTime.set(key, Date.now());
            
            if (ttl > 0) {
                setTimeout(() => {
                    this.delete(key);
                }, ttl);
            }
        } else {
            this.weakCache.set(key, value);
        }
    }

    get(key) {
        if (this.strongCache.has(key)) {
            const count = this.accessCount.get(key) || 0;
            this.accessCount.set(key, count + 1);
            return this.strongCache.get(key);
        }
        
        return this.weakCache.get(key);
    }

    delete(key) {
        this.strongCache.delete(key);
        this.accessCount.delete(key);
        this.creationTime.delete(key);
    }

    evictLRU() {
        let lruKey = null;
        let minAccessCount = Infinity;
        let oldestTime = Date.now();

        for (const [key, count] of this.accessCount) {
            const creationTime = this.creationTime.get(key);
            if (count < minAccessCount || 
                (count === minAccessCount && creationTime < oldestTime)) {
                minAccessCount = count;
                oldestTime = creationTime;
                lruKey = key;
            }
        }

        if (lruKey) {
            this.delete(lruKey);
        }
    }

    startCleanupInterval() {
        this.cleanupInterval = setInterval(() => {
            const now = Date.now();
            for (const [key, creationTime] of this.creationTime) {
                const age = now - creationTime;
                if (age > this.config.defaultTTL * 2) {
                    this.delete(key);
                }
            }
        }, this.config.cleanupInterval);
    }

    clear() {
        this.strongCache.clear();
        this.accessCount.clear();
        this.creationTime.clear();
    }

    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.clear();
    }
}

export class VideoCache extends SmartCache {
    constructor() {
        super({
            maxSize: 50,
            defaultTTL: 60000,
            cleanupInterval: 30000
        });
    }

    cacheVideo(videoId, videoData) {
        this.set(`video_${videoId}`, videoData, {
            strong: true,
            ttl: 120000
        });
    }

    getVideo(videoId) {
        return this.get(`video_${videoId}`);
    }
}

export class ImageCache extends SmartCache {
    constructor() {
        super({
            maxSize: 200,
            defaultTTL: 300000,
            cleanupInterval: 120000
        });
    }
}