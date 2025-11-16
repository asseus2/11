const Config = {
    API: {
        BASE_URL: 'https://api.socialflow.com',
        TIMEOUT: 30000,
        RETRY_ATTEMPTS: 3
    },
    APP: {
        NAME: 'SocialFlow',
        VERSION: '1.0.0'
    },
    FEATURES: {
        OFFLINE_MODE: true,
        ANALYTICS: true,
        DEBUG: false
    },
    PERFORMANCE: {
        CACHE_TTL: 30000,
        MEMORY_THRESHOLD: 100 * 1024 * 1024
    },
    UI: {
        THEMES: ['dark', 'light'],
        DEFAULT_THEME: 'dark',
        VIDEO: {
            QUALITIES: ['auto', '1080p', '720p', '480p', '360p'],
            AUTOPLAY: true,
            MUTED: true
        }
    }
};

Object.freeze(Config);
export { Config };