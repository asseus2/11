import { SecureAuthManager } from './auth-manager.js';
import { ImmutableStateManager } from './state-manager.js';
import { AdvancedVideoPlayer } from './video-player.js';
import { ComprehensiveErrorBoundary } from './error-boundary.js';
import { securityManager, strictSanitizeHTML } from './utils/security.js';
import { APICircuitBreaker } from './utils/circuit-breaker.js';
import { VideoCache, ImageCache } from './utils/smart-cache.js';
import { Config } from './utils/config.js';
import { 
    formatCount, formatTime, debounce, throttle,
    escapeHTML, generateId, isElementInViewport
} from './utils/helpers.js';

class SocialFlowApp {
    constructor() {
        this.stateManager = new ImmutableStateManager();
        this.errorBoundary = new ComprehensiveErrorBoundary();
        this.authManager = new SecureAuthManager();
        this.videoCache = new VideoCache();
        this.imageCache = new ImageCache();
        this.apiCircuitBreaker = new APICircuitBreaker();
        
        this.videoPlayers = new Map();
        this.currentPage = 'home';
        this.isInitialized = false;
        this.eventListeners = new Map();
        this.abortController = new AbortController();
        
        this.virtualScroll = {
            container: null,
            itemHeight: 300,
            buffer: 5,
            visibleItems: new Map()
        };

        this.memoryCheckInterval = null;
        this.preloadQueue = new Set();
    }

    async init() {
        try {
            await securityManager.init();
            this.errorBoundary.init();
            this.setupGlobalErrorHandling();
            
            await Promise.all([
                this.stateManager.init(),
                this.authManager.init()
            ]);
            
            this.setupEventListeners();
            this.setupPerformanceOptimizations();
            this.initializeUI();
            this.setupServiceWorker();
            
            this.isInitialized = true;
            console.log('SocialFlow App initialized successfully');
            
        } catch (error) {
            this.errorBoundary.handleGlobalError({ error });
        }
    }

    setupGlobalErrorHandling() {
        this.errorBoundary.registerComponent(
            'video_player',
            (error, context) => this.handleVideoError(error, context),
            () => this.recoverVideoPlayers()
        );

        window.addEventListener('error', (event) => {
            this.errorBoundary.handleGlobalError(event);
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.errorBoundary.handlePromiseRejection(event);
        });
    }

    setupEventListeners() {
        const signal = this.abortController.signal;

        this.addEventListener('click', '[data-page]', (e) => {
            const page = e.currentTarget.dataset.page;
            this.switchPage(page);
        }, { signal });

        this.addEventListener('click', '#themeToggle', () => {
            this.toggleTheme();
        }, { signal });

        this.addEventListener('click', '#demoLogin', () => {
            this.authManager.enableDemoMode();
            this.initializeUI();
        }, { signal });

        this.addEventListener('click', '[data-video-action]', (e) => {
            const action = e.currentTarget.dataset.videoAction;
            const videoId = e.currentTarget.dataset.videoId;
            this.handleVideoAction(action, videoId);
        }, { signal });

        this.addEventListener(document, 'visibilitychange', () => {
            this.handleVisibilityChange();
        }, { signal });

        this.addEventListener(window, 'resize', 
            throttle(() => this.handleResize(), 250), 
            { signal }
        );
    }

    addEventListener(target, event, handler, options = {}) {
        const actualTarget = typeof target === 'string' ? document : target;
        actualTarget.addEventListener(event, handler, options);
        
        const key = `${event}_${generateId()}`;
        if (!this.eventListeners.has(key)) {
            this.eventListeners.set(key, []);
        }
        this.eventListeners.get(key).push({ target: actualTarget, event, handler });
    }

    setupPerformanceOptimizations() {
        this.setupVirtualScrolling();
        this.setupMemoryMonitoring();
        this.setupLazyLoading();
        this.setupIntelligentPreloading();
    }

    setupVirtualScrolling() {
        this.virtualScroll.container = document.getElementById('videoFeed');
        if (this.virtualScroll.container) {
            this.addEventListener(this.virtualScroll.container, 'scroll',
                throttle(() => this.renderVisibleVideos(), 100)
            );
            this.renderVisibleVideos();
        }
    }

    renderVisibleVideos() {
        if (!this.virtualScroll.container) return;
        this.renderVideoRange(0, 10);
    }

    renderVideoRange(startIdx, endIdx) {
        const feed = document.getElementById('videoFeed');
        if (!feed) return;

        const existingElements = new Map();
        Array.from(feed.children).forEach(child => {
            if (child.dataset && child.dataset.videoId) {
                existingElements.set(child.dataset.videoId, child);
            }
        });

        const fragment = document.createDocumentFragment();
        const usedIds = new Set();

        // Demo videoları render et
        const demoVideos = [
            {
                id: '1',
                caption: 'SocialFlow Demo - Harika içerik! 🎥',
                media: [{ 
                    type: 'image', 
                    url: 'https://picsum.photos/400/600?random=1',
                    thumbnail: 'https://picsum.photos/400/600?random=1'
                }],
                likes: 1542,
                timestamp: Date.now() - 3600000
            },
            {
                id: '2',
                caption: 'Video platformunda yeni dönem başlıyor! 🚀',
                media: [{ 
                    type: 'image', 
                    url: 'https://picsum.photos/400/600?random=2',
                    thumbnail: 'https://picsum.photos/400/600?random=2'
                }],
                likes: 893,
                timestamp: Date.now() - 7200000
            },
            {
                id: '3',
                caption: 'Teknoloji ve içerik bir arada! 💫',
                media: [{ 
                    type: 'image', 
                    url: 'https://picsum.photos/400/600?random=3',
                    thumbnail: 'https://picsum.photos/400/600?random=3'
                }],
                likes: 2451,
                timestamp: Date.now() - 10800000
            }
        ];

        demoVideos.forEach((video, index) => {
            const absoluteIndex = startIdx + index;
            usedIds.add(video.id);

            let element = existingElements.get(video.id);
            
            if (!element) {
                element = this.createVideoElement(video, absoluteIndex);
                fragment.appendChild(element);
            }
            
            this.virtualScroll.visibleItems.set(video.id, element);
        });

        if (fragment.children.length > 0) {
            feed.appendChild(fragment);
        }

        this.initializeVideoPlayers();
    }

    setupIntelligentPreloading() {
        this.addEventListener('mouseenter', '.video-container', (e) => {
            const container = e.currentTarget;
            const videoId = container.dataset.videoId;
            
            if (videoId && !this.preloadQueue.has(videoId)) {
                this.preloadQueue.add(videoId);
            }
        }, { passive: true });
    }

    setupMemoryMonitoring() {
        if (performance.memory) {
            this.memoryCheckInterval = setInterval(() => {
                const memory = performance.memory;
                const usedMB = memory.usedJSHeapSize / 1048576;
                
                if (usedMB > 200) {
                    this.cleanupUnusedResources();
                }
            }, 30000);
        }
    }

    cleanupUnusedResources() {
        this.virtualScroll.visibleItems.forEach((element, videoId) => {
            if (!isElementInViewport(element)) {
                this.cleanupVideoElement(videoId);
            }
        });
        this.videoCache.clear();
    }

    cleanupVideoElement(videoId) {
        const player = this.videoPlayers.get(videoId);
        if (player) {
            player.destroy();
            this.videoPlayers.delete(videoId);
        }
        this.virtualScroll.visibleItems.delete(videoId);
        this.preloadQueue.delete(videoId);
    }

    setupLazyLoading() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const container = entry.target;
                    this.loadVideoContent(container);
                    observer.unobserve(container);
                }
            });
        }, { 
            rootMargin: '100px 0px',
            threshold: 0.1 
        });

        document.querySelectorAll('.video-container').forEach(container => {
            observer.observe(container);
        });
    }

    loadVideoContent(container) {
        const images = container.querySelectorAll('img[data-src]');
        images.forEach(img => {
            if (img.dataset.src) {
                img.src = img.dataset.src;
                delete img.dataset.src;
            }
        });
    }

    async initializeUI() {
        if (this.authManager.isAuthenticated || this.authManager.isDemoMode) {
            await this.showMainApp();
        } else {
            this.showWelcomeScreen();
        }

        this.setTheme(Config.UI.DEFAULT_THEME);
    }

    async showMainApp() {
        document.getElementById('welcomeScreen').style.display = 'none';
        document.getElementById('mainHeader').style.display = 'flex';
        document.getElementById('mainContent').style.display = 'block';
        document.getElementById('bottomNav').style.display = 'flex';
        
        await this.loadHomePage();
    }

    showWelcomeScreen() {
        document.getElementById('welcomeScreen').style.display = 'flex';
        document.getElementById('mainHeader').style.display = 'none';
        document.getElementById('mainContent').style.display = 'none';
        document.getElementById('bottomNav').style.display = 'none';
    }

    async switchPage(page) {
        if (this.currentPage === page) return;
        this.currentPage = page;
        await this.loadCurrentPage();
    }

    async loadCurrentPage() {
        try {
            switch (this.currentPage) {
                case 'home':
                    await this.loadHomePage();
                    break;
                case 'explore':
                    await this.loadExplorePage();
                    break;
                case 'profile':
                    await this.loadProfilePage();
                    break;
                case 'analytics':
                    await this.loadAnalyticsPage();
                    break;
            }
        } catch (error) {
            this.errorBoundary.handleComponentError('page_loader', error, {
                page: this.currentPage
            });
        }
    }

    async loadHomePage() {
        const videos = await this.stateManager.getVideos();
        this.renderVideoFeed(videos);
    }

    renderVideoFeed(videos) {
        const feed = document.getElementById('videoFeed');
        if (!feed) return;
        this.renderVideoRange(0, 10);
    }

    createVideoElement(video, index) {
        const container = document.createElement('div');
        container.className = 'video-container';
        container.dataset.videoId = video.id;
        container.dataset.videoIndex = index;
        
        container.innerHTML = strictSanitizeHTML`
            <div class="video-player-container">
                <div class="media-gallery">
                    <div class="media-container">
                        <div class="media-item active">
                            <img data-src="${video.media[0].url}" alt="${video.caption}" loading="lazy">
                        </div>
                    </div>
                </div>
                <div class="video-overlay">
                    <div class="video-caption">${video.caption}</div>
                    <div class="video-stats">
                        <span>${formatCount(video.likes)} beğeni</span>
                        <span>${formatTime(video.timestamp)}</span>
                    </div>
                </div>
                <div class="video-actions">
                    <button class="btn" data-video-action="like" data-video-id="${video.id}">
                        <i class="fas fa-heart"></i>
                    </button>
                    <button class="btn" data-video-action="share" data-video-id="${video.id}">
                        <i class="fas fa-share"></i>
                    </button>
                    <button class="btn" data-video-action="save" data-video-id="${video.id}">
                        <i class="fas fa-bookmark"></i>
                    </button>
                </div>
            </div>
        `;
        
        return container;
    }

    initializeVideoPlayers() {
        document.querySelectorAll('.video-container').forEach(container => {
            const videoId = container.dataset.videoId;
            if (!this.videoPlayers.has(videoId)) {
                try {
                    const player = new AdvancedVideoPlayer(container);
                    this.videoPlayers.set(videoId, player);
                } catch (error) {
                    this.errorBoundary.handleComponentError('video_player', error, {
                        videoId,
                        operation: 'initialization'
                    });
                }
            }
        });
    }

    async handleVideoAction(action, videoId) {
        try {
            await this.apiCircuitBreaker.execute(async () => {
                switch (action) {
                    case 'like':
                        const liked = await this.stateManager.likeVideo(videoId);
                        this.showToast(liked ? 'Beğenildi ❤️' : 'Beğeni kaldırıldı 💔');
                        break;
                    case 'share':
                        await this.shareVideo(videoId);
                        break;
                    case 'save':
                        await this.saveVideo(videoId);
                        break;
                }
            }, { operation: `video_${action}`, videoId });
        } catch (error) {
            this.errorBoundary.handleComponentError('video_action', error, {
                action,
                videoId
            });
        }
    }

    async shareVideo(videoId) {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'SocialFlow Video',
                    text: 'Bu videoyu SocialFlow\'da izle!',
                    url: `${window.location.origin}/video/${videoId}`
                });
            } catch (error) {
                console.log('Paylaşım iptal edildi');
            }
        } else {
            this.fallbackShare(videoId);
        }
    }

    fallbackShare(videoId) {
        const url = `${window.location.origin}/video/${videoId}`;
        navigator.clipboard.writeText(url).then(() => {
            this.showToast('Link panoya kopyalandı! 📋');
        });
    }

    async saveVideo(videoId) {
        this.showToast('Video kaydedildi! 📁');
    }

    showToast(message) {
        document.querySelectorAll('.toast').forEach(toast => toast.remove());
        
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.remove(), 3000);
    }

    handleVideoError(error, context) {
        console.error('Video error:', error, context);
        if (context.videoId) {
            const player = this.videoPlayers.get(context.videoId);
            if (player) {
                player.destroy();
                this.videoPlayers.delete(context.videoId);
            }
        }
    }

    async recoverVideoPlayers() {
        this.videoPlayers.forEach(player => player.destroy());
        this.videoPlayers.clear();
        this.initializeVideoPlayers();
    }

    handleVisibilityChange() {
        if (document.hidden) {
            this.pauseAllVideos();
        } else {
            this.resumeVideos();
        }
    }

    handleResize() {
        this.renderVisibleVideos();
    }

    pauseAllVideos() {
        this.videoPlayers.forEach(player => player.pause());
    }

    resumeVideos() {
        this.videoPlayers.forEach((player, videoId) => {
            const container = document.querySelector(`[data-video-id="${videoId}"]`);
            if (container && isElementInViewport(container)) {
                player.play().catch(console.error);
            }
        });
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        
        if (theme === 'dark') {
            document.documentElement.style.setProperty('--bg-dark', '#000000');
            document.documentElement.style.setProperty('--bg-card', '#1c1c1e');
            document.documentElement.style.setProperty('--text-light', '#ffffff');
        } else {
            document.documentElement.style.setProperty('--bg-dark', '#ffffff');
            document.documentElement.style.setProperty('--bg-card', '#f2f2f7');
            document.documentElement.style.setProperty('--text-light', '#000000');
        }
    }

    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw.js')
                .then(registration => {
                    console.log('Service Worker registered:', registration);
                })
                .catch(error => {
                    console.log('Service Worker registration failed:', error);
                });
        }
    }

    logEvent(eventName, data = {}) {
        const event = {
            name: eventName,
            timestamp: new Date().toISOString(),
            ...data
        };

        if (window.gtag) {
            gtag('event', eventName, data);
        }

        console.log('App Event:', event);
    }

    cleanup() {
        if (this.memoryCheckInterval) clearInterval(this.memoryCheckInterval);
        
        this.virtualScroll.visibleItems.forEach((element, videoId) => {
            this.cleanupVideoElement(videoId);
        });
        
        this.videoPlayers.forEach(player => player.destroy());
        this.videoPlayers.clear();
        this.stateManager.cleanup();
        this.authManager.cleanup();
        this.errorBoundary.cleanup();
        this.videoCache.destroy();
        this.imageCache.destroy();

        this.eventListeners.forEach((listeners) => {
            listeners.forEach(({ target, event, handler }) => {
                target.removeEventListener(event, handler);
            });
        });
        this.eventListeners.clear();

        this.abortController.abort();
    }
}

// Initialize app
window.app = new SocialFlowApp();
window.errorBoundary = window.app.errorBoundary;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.app.init().catch(console.error);
    });
} else {
    window.app.init().catch(console.error);
}

window.addEventListener('beforeunload', () => {
    window.app?.cleanup();
});

export { SocialFlowApp };