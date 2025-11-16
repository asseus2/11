class ImmutableStateManager {
    constructor() {
        this._state = Object.freeze({
            videos: new Map(),
            likedVideos: new Set(),
            savedVideos: new Set(),
            currentMediaIndexes: new Map(),
            online: navigator.onLine,
            ui: {
                theme: 'dark',
                language: 'tr',
                videoQuality: 'auto'
            }
        });
    }

    async init() {
        await this.loadFromStorage();
    }

    get state() {
        return this._state;
    }

    async getVideos() {
        return new Map([
            ['1', {
                id: '1',
                caption: 'SocialFlow Demo - Harika içerik! 🎥',
                media: [{ 
                    type: 'image', 
                    url: 'https://picsum.photos/400/600?random=1',
                    thumbnail: 'https://picsum.photos/400/600?random=1'
                }],
                user: {
                    id: 'user1',
                    name: 'SocialFlow Official',
                    avatar: 'https://picsum.photos/100/100?random=user1'
                },
                likes: 1542,
                shares: 243,
                comments: 56,
                timestamp: Date.now() - 3600000
            }],
            ['2', {
                id: '2',
                caption: 'Video platformunda yeni dönem başlıyor! 🚀',
                media: [{ 
                    type: 'image', 
                    url: 'https://picsum.photos/400/600?random=2',
                    thumbnail: 'https://picsum.photos/400/600?random=2'
                }],
                user: {
                    id: 'user2',
                    name: 'Tech Innovator',
                    avatar: 'https://picsum.photos/100/100?random=user2'
                },
                likes: 893,
                shares: 124,
                comments: 34,
                timestamp: Date.now() - 7200000
            }],
            ['3', {
                id: '3',
                caption: 'Teknoloji ve içerik bir arada! 💫',
                media: [{ 
                    type: 'image', 
                    url: 'https://picsum.photos/400/600?random=3',
                    thumbnail: 'https://picsum.photos/400/600?random=3'
                }],
                user: {
                    id: 'user3',
                    name: 'Content Creator',
                    avatar: 'https://picsum.photos/100/100?random=user3'
                },
                likes: 2451,
                shares: 567,
                comments: 89,
                timestamp: Date.now() - 10800000
            }]
        ]);
    }

    async likeVideo(videoId) {
        const previousLiked = this.state.likedVideos.has(videoId);
        const newLiked = !previousLiked;

        this.setState(state => ({
            likedVideos: new Set(
                newLiked 
                    ? [...state.likedVideos, videoId]
                    : Array.from(state.likedVideos).filter(id => id !== videoId)
            )
        }));

        return newLiked;
    }

    setState(updater) {
        const newState = typeof updater === 'function' ? updater(this._state) : updater;
        this._state = Object.freeze({
            ...this._state,
            ...newState
        });
    }

    setCurrentMediaIndex(videoId, index) {
        this.setState(state => ({
            currentMediaIndexes: new Map(state.currentMediaIndexes).set(videoId, index)
        }));
    }

    getCurrentMediaIndex(videoId) {
        return this.state.currentMediaIndexes.get(videoId) || 0;
    }

    async loadFromStorage() {
        // Basit storage yükleme
        try {
            const savedTheme = localStorage.getItem('socialflow_theme');
            if (savedTheme) {
                this.setState({
                    ui: { ...this.state.ui, theme: savedTheme }
                });
            }
        } catch (error) {
            console.warn('Storage load error:', error);
        }
    }

    saveToStorageDebounced() {
        localStorage.setItem('socialflow_theme', this.state.ui.theme);
    }

    invalidateCache(pattern) {
        // Cache temizleme
    }

    cleanup() {
        this.saveToStorageDebounced();
    }
}

export { ImmutableStateManager };